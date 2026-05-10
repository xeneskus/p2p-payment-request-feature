import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export type ApiErrorCode =
  | 'invalid_body'
  | 'invalid_query'
  | 'invalid_credentials'
  | 'invalid_credentials_format'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'not_pending'
  | 'expired'
  | 'self_request'
  | 'internal_error'

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  invalid_body: 400,
  invalid_query: 400,
  invalid_credentials_format: 400,
  self_request: 400,
  invalid_credentials: 401,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  not_pending: 409,
  expired: 410,
  internal_error: 500,
}

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get httpStatus(): number {
    return STATUS_BY_CODE[this.code]
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      {
        error: {
          code: this.code,
          message: this.message,
          ...(this.details ? { details: this.details } : {}),
        },
      },
      { status: this.httpStatus },
    )
  }

  static fromZod(error: ZodError, code: ApiErrorCode = 'invalid_body'): ApiError {
    const issue = error.issues[0]
    const message = issue ? `${issue.path.join('.')}: ${issue.message}` : 'invalid input'
    return new ApiError(code, message, { issues: error.issues })
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return error.toResponse()
  }
  if (error instanceof ZodError) {
    return ApiError.fromZod(error).toResponse()
  }
  console.error('Unhandled API error:', error)
  return new ApiError('internal_error', 'Unexpected server error').toResponse()
}
