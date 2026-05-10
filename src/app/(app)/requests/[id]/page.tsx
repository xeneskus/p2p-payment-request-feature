import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/status-pill'
import { ExpiryCountdown } from '@/components/expiry-countdown'
import { Money } from '@/lib/money'
import { ApiError } from '@/lib/api-error'
import { requireUser } from '@/features/auth/server'
import { getRequestForUser } from '@/features/requests/service'
import { ActionButtons } from './action-buttons'

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let user
  try {
    user = await requireUser()
  } catch {
    redirect('/login')
  }

  let request
  try {
    request = await getRequestForUser(user, id)
  } catch (err) {
    if (err instanceof ApiError && err.code === 'not_found') notFound()
    throw err
  }

  const isSender = request.fromUserId === user.id
  const isRecipient = request.toEmail === user.email

  const shareUrl =
    typeof process.env.NEXT_PUBLIC_APP_URL === 'string'
      ? `${process.env.NEXT_PUBLIC_APP_URL}/pay/${request.shareableToken}`
      : `/pay/${request.shareableToken}`

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href="/dashboard" className="text-muted-foreground hover:text-foreground text-sm">
        ← Back to dashboard
      </Link>
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {Money.fromCents(request.amountCents).format()}
            </CardTitle>
            <StatusPill status={request.status} />
          </div>
          {request.status === 'pending' && <ExpiryCountdown expiresAt={request.expiresAt} />}
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">From</dt>
            <dd>{request.fromEmail}</dd>
            <dt className="text-muted-foreground">To</dt>
            <dd>{request.toEmail}</dd>
            {request.note && (
              <>
                <dt className="text-muted-foreground">Note</dt>
                <dd className="whitespace-pre-wrap break-words">{request.note}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Created</dt>
            <dd>{new Date(request.createdAt).toLocaleString()}</dd>
            <dt className="text-muted-foreground">Expires</dt>
            <dd>{new Date(request.expiresAt).toLocaleString()}</dd>
            <dt className="text-muted-foreground">Shareable link</dt>
            <dd className="truncate">
              <a className="underline-offset-4 hover:underline" href={shareUrl}>
                {shareUrl}
              </a>
            </dd>
          </dl>
          {request.status === 'pending' && (
            <ActionButtons
              requestId={request.id}
              role={isSender ? 'sender' : isRecipient ? 'recipient' : 'observer'}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
