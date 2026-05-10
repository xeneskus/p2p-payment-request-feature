import { Badge } from '@/components/ui/badge'
import { Ban, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react'
import type { RequestStatusValue } from '@/features/requests/schema'
import { cn } from '@/lib/utils'

const CONFIG: Record<RequestStatusValue, { label: string; icon: typeof Clock; className: string }> =
  {
    pending: {
      label: 'Pending',
      icon: Clock,
      className: 'bg-amber-100 text-amber-900 border-amber-200',
    },
    paid: {
      label: 'Paid',
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    },
    declined: {
      label: 'Declined',
      icon: XCircle,
      className: 'bg-rose-100 text-rose-900 border-rose-200',
    },
    cancelled: {
      label: 'Cancelled',
      icon: Ban,
      className: 'bg-slate-100 text-slate-900 border-slate-200',
    },
    expired: {
      label: 'Expired',
      icon: AlertCircle,
      className: 'bg-stone-100 text-stone-900 border-stone-200',
    },
  }

export function StatusPill({ status }: { status: RequestStatusValue }) {
  const { label, icon: Icon, className } = CONFIG[status]
  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 font-medium', className)}
      data-testid={`status-${status}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  )
}
