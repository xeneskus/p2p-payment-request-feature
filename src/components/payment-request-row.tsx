import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Money } from '@/lib/money'
import { StatusPill } from './status-pill'
import { ExpiryCountdown } from './expiry-countdown'
import type { PaymentRequest } from '@/features/requests/types'

type Props = {
  request: PaymentRequest
  direction: 'outgoing' | 'incoming'
}

export function PaymentRequestRow({ request, direction }: Props) {
  const Icon = direction === 'outgoing' ? ArrowUpRight : ArrowDownLeft
  const counterparty = direction === 'outgoing' ? request.toEmail : request.fromEmail
  return (
    <Link
      href={`/requests/${request.id}`}
      data-testid="payment-request-row"
      className="bg-card hover:bg-accent/40 flex items-center justify-between rounded-md border px-4 py-3 transition-colors"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-muted text-muted-foreground rounded-md p-2">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{counterparty}</p>
          {request.note && <p className="text-muted-foreground truncate text-xs">{request.note}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 text-right">
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold tabular-nums" data-testid="amount">
            {Money.fromCents(request.amountCents).format()}
          </span>
          {request.status === 'pending' && <ExpiryCountdown expiresAt={request.expiresAt} />}
        </div>
        <StatusPill status={request.status} />
      </div>
    </Link>
  )
}
