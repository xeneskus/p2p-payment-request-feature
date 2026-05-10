import { NextResponse } from 'next/server'
import { requireUser } from '@/features/auth/server'
import { handleApiError } from '@/lib/api-error'
import { applyAction } from '@/features/requests/service'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await requireUser()
    const updated = await applyAction(user, id, 'pay')
    return NextResponse.json({ request: updated })
  } catch (err) {
    return handleApiError(err)
  }
}
