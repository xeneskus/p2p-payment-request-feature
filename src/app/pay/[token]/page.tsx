import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { StatusPill } from '@/components/status-pill'
import { Money } from '@/lib/money'
import { ApiError } from '@/lib/api-error'
import { getPublicByToken } from '@/features/requests/service'

export default async function PublicPaymentLinkPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  let request
  try {
    request = await getPublicByToken(token)
  } catch (err) {
    if (err instanceof ApiError && err.code === 'not_found') notFound()
    throw err
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {Money.fromCents(request.amountCents).format()}
            </CardTitle>
            <StatusPill status={request.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            <strong>{request.senderDisplayName}</strong> is requesting this amount from you.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.note && (
            <p className="bg-muted/40 rounded-md px-3 py-2 text-sm whitespace-pre-wrap break-words">
              {request.note}
            </p>
          )}
          {request.status === 'pending' ? (
            <Link
              href={`/login?next=${encodeURIComponent(`/pay/${token}`)}`}
              className={buttonVariants({ className: 'w-full' })}
            >
              Sign in to pay
            </Link>
          ) : (
            <p className="text-muted-foreground text-center text-sm">
              This request is {request.status} and can no longer be acted on.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
