import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-error'
import { getPublicByToken } from '@/features/requests/service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const item = await getPublicByToken(token)
    return NextResponse.json({ request: item })
  } catch (err) {
    return handleApiError(err)
  }
}
