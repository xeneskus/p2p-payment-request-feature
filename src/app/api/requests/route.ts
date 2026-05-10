import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/features/auth/server'
import { handleApiError, ApiError } from '@/lib/api-error'
import { createRequestBodySchema, listQuerySchema } from '@/features/requests/schema'
import { createRequest, listRequests } from '@/features/requests/service'

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const json = await request.json().catch(() => {
      throw new ApiError('invalid_body', 'Body must be valid JSON')
    })
    const parsed = createRequestBodySchema.safeParse(json)
    if (!parsed.success) throw ApiError.fromZod(parsed.error)
    const created = await createRequest(user.id, user.email, parsed.data)
    return NextResponse.json({ request: created }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const queryObj = Object.fromEntries(request.nextUrl.searchParams.entries())
    const parsed = listQuerySchema.safeParse(queryObj)
    if (!parsed.success) throw ApiError.fromZod(parsed.error, 'invalid_query')
    const items = await listRequests(user, parsed.data)
    return NextResponse.json({ requests: items })
  } catch (err) {
    return handleApiError(err)
  }
}
