'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Role = 'sender' | 'recipient' | 'observer'

export function ActionButtons({ requestId, role }: { requestId: string; role: Role }) {
  const router = useRouter()
  const [busy, setBusy] = useState<null | 'pay' | 'decline' | 'cancel'>(null)
  const [confirmOpen, setConfirmOpen] = useState<null | 'pay' | 'decline' | 'cancel'>(null)

  async function run(action: 'pay' | 'decline' | 'cancel') {
    setBusy(action)
    setConfirmOpen(null)
    try {
      const res = await fetch(`/api/requests/${requestId}/${action}`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body?.error?.message ?? `Request failed (${res.status})`)
        setBusy(null)
        return
      }
      if (action === 'pay') {
        router.replace(`/requests/${requestId}/success`)
      } else {
        toast.success(action === 'decline' ? 'Request declined' : 'Request cancelled')
        router.refresh()
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  if (role === 'observer') return null

  return (
    <div className="flex gap-2">
      {role === 'recipient' && (
        <>
          <Button
            className="flex-1"
            onClick={() => setConfirmOpen('pay')}
            disabled={!!busy}
            data-testid="pay-button"
          >
            {busy === 'pay' ? 'Processing…' : 'Pay'}
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => setConfirmOpen('decline')}
            disabled={!!busy}
            data-testid="decline-button"
          >
            Decline
          </Button>
        </>
      )}
      {role === 'sender' && (
        <Button
          className="flex-1"
          variant="outline"
          onClick={() => setConfirmOpen('cancel')}
          disabled={!!busy}
          data-testid="cancel-button"
        >
          Cancel request
        </Button>
      )}

      <Dialog open={confirmOpen !== null} onOpenChange={(open) => !open && setConfirmOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmOpen === 'pay' && 'Confirm payment'}
              {confirmOpen === 'decline' && 'Decline this request?'}
              {confirmOpen === 'cancel' && 'Cancel this request?'}
            </DialogTitle>
            <DialogDescription>
              {confirmOpen === 'pay' &&
                'This will simulate a settlement and move the request to Paid.'}
              {confirmOpen === 'decline' &&
                'The sender will see Declined status. This cannot be undone.'}
              {confirmOpen === 'cancel' &&
                'The recipient will see Cancelled status. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(null)}>
              Back
            </Button>
            <Button onClick={() => confirmOpen && run(confirmOpen)} data-testid="confirm-action">
              {confirmOpen === 'pay' && 'Confirm payment'}
              {confirmOpen === 'decline' && 'Decline'}
              {confirmOpen === 'cancel' && 'Cancel request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
