'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Money, MoneyError } from '@/lib/money'

const formSchema = z.object({
  toEmail: z.string().trim().email('Enter a valid email'),
  amount: z
    .string()
    .trim()
    .min(1, 'Amount is required')
    .refine(
      (v) => {
        try {
          Money.fromDollars(v)
          return true
        } catch (err) {
          return !(err instanceof MoneyError)
        }
      },
      { message: 'Amount must be a positive value with at most two decimals' },
    ),
  note: z.string().max(280, 'Up to 280 characters').optional(),
})
type FormValues = z.infer<typeof formSchema>

export default function NewRequestPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { toEmail: '', amount: '', note: '' },
  })

  async function onSubmit(values: FormValues) {
    setBusy(true)
    try {
      const amountCents = Money.fromDollars(values.amount).cents
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          toEmail: values.toEmail,
          amountCents,
          note: values.note?.trim() || undefined,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body?.error?.message ?? `Request failed (${res.status})`)
        setBusy(false)
        return
      }
      toast.success('Request sent')
      router.replace('/dashboard')
      router.refresh()
    } catch (err) {
      setBusy(false)
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>New payment request</CardTitle>
          <p className="text-muted-foreground text-sm">
            Request money from a friend by email. They will see the amount, your note, and a Pay
            button.
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            data-testid="new-request-form"
          >
            <div className="space-y-2">
              <Label htmlFor="toEmail">Recipient email</Label>
              <Input
                id="toEmail"
                type="email"
                autoComplete="off"
                placeholder="friend@example.com"
                {...form.register('toEmail')}
              />
              {form.formState.errors.toEmail && (
                <p className="text-destructive text-sm">{form.formState.errors.toEmail.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="40.00"
                {...form.register('amount')}
              />
              {form.formState.errors.amount && (
                <p className="text-destructive text-sm">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Input id="note" placeholder="Concert tickets" {...form.register('note')} />
              {form.formState.errors.note && (
                <p className="text-destructive text-sm">{form.formState.errors.note.message}</p>
              )}
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Sending…' : 'Send request'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
