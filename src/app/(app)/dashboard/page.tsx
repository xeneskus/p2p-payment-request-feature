'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Inbox } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useRequests } from '@/features/requests/hooks'
import { PaymentRequestRow } from '@/components/payment-request-row'
import type { RequestStatusValue } from '@/features/requests/schema'

const STATUS_OPTIONS: Array<{ value: RequestStatusValue | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'declined', label: 'Declined' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
]

export default function DashboardPage() {
  const [direction, setDirection] = useState<'outgoing' | 'incoming'>('outgoing')
  const [status, setStatus] = useState<RequestStatusValue | 'all'>('all')
  const [q, setQ] = useState('')

  const { items, loading, error } = useRequests({ direction, status, q })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Requests</h1>
          <p className="text-muted-foreground text-sm">
            Send, receive, and manage payment requests with your friends.
          </p>
        </div>
        <Link href="/requests/new" data-testid="new-request" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          New request
        </Link>
      </div>

      <Tabs value={direction} onValueChange={(v) => setDirection(v as 'outgoing' | 'incoming')}>
        <TabsList>
          <TabsTrigger value="outgoing" data-testid="tab-outgoing">
            Outgoing
          </TabsTrigger>
          <TabsTrigger value="incoming" data-testid="tab-incoming">
            Incoming
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <Badge
                key={opt.value}
                variant={status === opt.value ? 'default' : 'outline'}
                onClick={() => setStatus(opt.value)}
                className="cursor-pointer select-none"
                data-testid={`filter-${opt.value}`}
              >
                {opt.label}
              </Badge>
            ))}
          </div>
          <Input
            placeholder={direction === 'outgoing' ? 'Search recipient…' : 'Search sender…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="sm:max-w-xs"
            data-testid="search"
          />
        </div>

        <TabsContent value={direction} className="mt-4">
          {error && (
            <p className="text-destructive border-destructive/30 bg-destructive/5 rounded-md border px-3 py-2 text-sm">
              {error}
            </p>
          )}
          {loading && !items.length && (
            <p className="text-muted-foreground py-12 text-center text-sm">Loading requests…</p>
          )}
          {!loading && !items.length && !error && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Inbox className="text-muted-foreground h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                {direction === 'outgoing'
                  ? 'You have not sent any requests yet.'
                  : 'No incoming requests.'}
              </p>
            </div>
          )}
          <div className="space-y-2">
            {items.map((item) => (
              <PaymentRequestRow key={item.id} request={item} direction={direction} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
