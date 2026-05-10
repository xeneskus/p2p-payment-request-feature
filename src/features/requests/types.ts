import type { RequestStatusValue } from './schema'

export type PaymentRequest = {
  id: string
  fromUserId: string
  fromEmail: string
  fromDisplayName: string | null
  toEmail: string
  amountCents: number
  note: string | null
  status: RequestStatusValue
  shareableToken: string
  createdAt: string
  expiresAt: string
  paidAt: string | null
  declinedAt: string | null
  cancelledAt: string | null
}

export type PaymentRequestRow = {
  id: string
  from_user_id: string
  to_email: string
  amount_cents: number
  note: string | null
  status: RequestStatusValue
  shareable_token: string
  created_at: string
  expires_at: string
  paid_at: string | null
  declined_at: string | null
  cancelled_at: string | null
}
