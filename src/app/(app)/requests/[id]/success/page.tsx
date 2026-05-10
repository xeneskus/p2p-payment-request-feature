import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Money } from '@/lib/money'
import { ApiError } from '@/lib/api-error'
import { requireUser } from '@/features/auth/server'
import { getRequestForUser } from '@/features/requests/service'

export default async function PaySuccessPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <h1 className="text-2xl font-semibold">Payment sent</h1>
          <p className="text-3xl font-semibold tabular-nums">
            {Money.fromCents(request.amountCents).format()}
          </p>
          <p className="text-muted-foreground text-sm">
            Your simulated settlement to <strong>{request.fromEmail}</strong> is complete.
          </p>
          <Link href="/dashboard" className={buttonVariants({ className: 'mt-4' })}>
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
