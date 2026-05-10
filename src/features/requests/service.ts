import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { ApiError } from '@/lib/api-error'
import { effectiveStatus } from '@/lib/expiry'
import type { PaymentRequest, PaymentRequestRow } from './types'
import type { CreateRequestBody, RequestStatusValue } from './schema'

function rowToRequest(
  row: PaymentRequestRow,
  profile: { email: string; display_name: string | null } | null,
): PaymentRequest {
  const status = effectiveStatus({ status: row.status, expires_at: row.expires_at })
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    fromEmail: profile?.email ?? '',
    fromDisplayName: profile?.display_name ?? null,
    toEmail: row.to_email,
    amountCents: row.amount_cents,
    note: row.note,
    status,
    shareableToken: row.shareable_token,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    declinedAt: row.declined_at,
    cancelledAt: row.cancelled_at,
  }
}

export async function createRequest(
  fromUserId: string,
  fromEmail: string,
  body: CreateRequestBody,
): Promise<PaymentRequest> {
  if (body.toEmail === fromEmail) {
    throw new ApiError('self_request', 'You cannot send a request to yourself')
  }
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      from_user_id: fromUserId,
      to_email: body.toEmail,
      amount_cents: body.amountCents,
      note: body.note ?? null,
    })
    .select('*')
    .single()
  if (error || !data) {
    if (error?.message?.startsWith('self_request')) {
      throw new ApiError('self_request', 'You cannot send a request to yourself')
    }
    throw new ApiError('internal_error', error?.message ?? 'Failed to create request')
  }
  return rowToRequest(data, { email: fromEmail, display_name: null })
}

type ListOptions = {
  direction: 'outgoing' | 'incoming'
  status?: RequestStatusValue
  q?: string
}

export async function listRequests(
  user: { id: string; email: string },
  opts: ListOptions,
): Promise<PaymentRequest[]> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('payment_requests')
    .select('*, profile:from_user_id(email, display_name)')
    .order('created_at', { ascending: false })

  if (opts.direction === 'outgoing') {
    query = query.eq('from_user_id', user.id)
  } else {
    query = query.eq('to_email', user.email)
  }

  if (opts.status) {
    query = query.eq('status', opts.status)
  }

  const { data, error } = await query
  if (error) {
    throw new ApiError('internal_error', error.message)
  }
  const items = (data ?? []).map((row) => {
    const profileRaw = (row as { profile?: { email: string; display_name: string | null } }).profile
    return rowToRequest(row as PaymentRequestRow, profileRaw ?? null)
  })
  if (opts.q) {
    const needle = opts.q.toLowerCase()
    return items.filter((r) => {
      if (opts.direction === 'outgoing') {
        return r.toEmail.includes(needle)
      }
      return (
        r.fromEmail.toLowerCase().includes(needle) ||
        (r.fromDisplayName ?? '').toLowerCase().includes(needle)
      )
    })
  }
  return items
}

export async function getRequestForUser(
  user: { id: string; email: string },
  id: string,
): Promise<PaymentRequest> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('payment_requests')
    .select('*, profile:from_user_id(email, display_name)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new ApiError('internal_error', error.message)
  if (!data) throw new ApiError('not_found', 'Request not found')
  const row = data as PaymentRequestRow & {
    profile?: { email: string; display_name: string | null }
  }
  if (row.from_user_id !== user.id && row.to_email !== user.email) {
    throw new ApiError('forbidden', 'You cannot view this request')
  }
  return rowToRequest(row, row.profile ?? null)
}

type Action = 'pay' | 'decline' | 'cancel'
const ACTION_COLUMNS: Record<Action, { status: string; column: string }> = {
  pay: { status: 'paid', column: 'paid_at' },
  decline: { status: 'declined', column: 'declined_at' },
  cancel: { status: 'cancelled', column: 'cancelled_at' },
}

export async function applyAction(
  user: { id: string; email: string },
  id: string,
  action: Action,
): Promise<PaymentRequest> {
  const supabase = getSupabaseAdmin()
  // Pre-fetch to derive accurate errors (404 / 403 / 410 / 409).
  const { data: existing, error: fetchError } = await supabase
    .from('payment_requests')
    .select('*, profile:from_user_id(email, display_name)')
    .eq('id', id)
    .maybeSingle()
  if (fetchError) throw new ApiError('internal_error', fetchError.message)
  if (!existing) throw new ApiError('not_found', 'Request not found')

  const row = existing as PaymentRequestRow & {
    profile?: { email: string; display_name: string | null }
  }

  const isSender = row.from_user_id === user.id
  const isRecipient = row.to_email === user.email
  if (action === 'cancel' && !isSender) {
    throw new ApiError('forbidden', 'Only the sender can cancel this request')
  }
  if ((action === 'pay' || action === 'decline') && !isRecipient) {
    throw new ApiError('forbidden', 'Only the recipient can act on this request')
  }
  if (row.status !== 'pending') {
    if (effectiveStatus({ status: row.status, expires_at: row.expires_at }) === 'expired') {
      throw new ApiError('expired', 'This request has expired')
    }
    throw new ApiError('not_pending', `Request is already ${row.status}`)
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new ApiError('expired', 'This request has expired')
  }

  if (action === 'pay') {
    // Spec FR-008: show a 2-3 second loading state. The server enforces the
    // delay so the UI cannot accidentally race ahead of settlement.
    await new Promise((resolve) => setTimeout(resolve, 2500))
  }

  const cfg = ACTION_COLUMNS[action]
  const update: Record<string, unknown> = { status: cfg.status }
  update[cfg.column] = new Date().toISOString()

  const { data: updated, error: updateError } = await supabase
    .from('payment_requests')
    .update(update)
    .eq('id', id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .select('*, profile:from_user_id(email, display_name)')
    .maybeSingle()
  if (updateError) throw new ApiError('internal_error', updateError.message)
  if (!updated) {
    // Another writer won the race or the row expired between fetch and update.
    throw new ApiError('not_pending', 'Request is no longer pending')
  }
  const updatedRow = updated as PaymentRequestRow & {
    profile?: { email: string; display_name: string | null }
  }
  return rowToRequest(updatedRow, updatedRow.profile ?? null)
}

export async function getPublicByToken(token: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('payment_requests')
    .select('amount_cents, note, status, expires_at, profile:from_user_id(email, display_name)')
    .eq('shareable_token', token)
    .maybeSingle()
  if (error) throw new ApiError('internal_error', error.message)
  if (!data) throw new ApiError('not_found', 'Link not found')
  const row = data as unknown as {
    amount_cents: number
    note: string | null
    status: RequestStatusValue
    expires_at: string
    profile?:
      | { email: string; display_name: string | null }
      | { email: string; display_name: string | null }[]
      | null
  }
  const profile = Array.isArray(row.profile) ? (row.profile[0] ?? null) : (row.profile ?? null)
  const status = effectiveStatus({ status: row.status, expires_at: row.expires_at })
  return {
    amountCents: row.amount_cents,
    note: row.note,
    status,
    expiresAt: row.expires_at,
    senderDisplayName: profile?.display_name ?? profile?.email?.split('@')[0] ?? 'A sender',
  }
}
