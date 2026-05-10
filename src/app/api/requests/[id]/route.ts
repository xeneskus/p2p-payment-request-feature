import { NextResponse } from 'next/server'
import { requireUser } from '@/features/auth/server'
import { handleApiError } from '@/lib/api-error'
import { getRequestForUser } from '@/features/requests/service'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await requireUser()
    const item = await getRequestForUser(user, id)
    return NextResponse.json({ request: item })
  } catch (err) {
    return handleApiError(err)
  }
}
