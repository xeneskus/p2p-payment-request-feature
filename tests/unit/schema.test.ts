import { describe, expect, it } from 'vitest'
import { createRequestBodySchema, credentialsSchema } from '@/features/requests/schema'

describe('credentialsSchema', () => {
  it('accepts a valid email + password', () => {
    expect(() =>
      credentialsSchema.parse({ email: 'alex@example.com', password: 'pw12345678' }),
    ).not.toThrow()
  })

  it('lowercases and trims the email', () => {
    const parsed = credentialsSchema.parse({ email: '  Alex@Example.COM ', password: 'pw12345678' })
    expect(parsed.email).toBe('alex@example.com')
  })

  it('rejects a malformed email', () => {
    expect(() =>
      credentialsSchema.parse({ email: 'not-an-email', password: 'pw12345678' }),
    ).toThrow()
  })

  it('rejects a too-short password', () => {
    expect(() =>
      credentialsSchema.parse({ email: 'alex@example.com', password: 'short' }),
    ).toThrow()
  })
})

describe('createRequestBodySchema', () => {
  const ok = {
    toEmail: 'blair@example.com',
    amountCents: 4000,
    note: 'Concert tickets',
  }

  it('accepts a well-formed body', () => {
    expect(() => createRequestBodySchema.parse(ok)).not.toThrow()
  })

  it('lowercases the recipient email', () => {
    const parsed = createRequestBodySchema.parse({ ...ok, toEmail: 'Blair@Example.COM' })
    expect(parsed.toEmail).toBe('blair@example.com')
  })

  it('rejects zero amount', () => {
    expect(() => createRequestBodySchema.parse({ ...ok, amountCents: 0 })).toThrow()
  })

  it('rejects negative amount', () => {
    expect(() => createRequestBodySchema.parse({ ...ok, amountCents: -1 })).toThrow()
  })

  it('rejects non-integer amount', () => {
    expect(() => createRequestBodySchema.parse({ ...ok, amountCents: 40.5 })).toThrow()
  })

  it('rejects amount above the cap', () => {
    expect(() => createRequestBodySchema.parse({ ...ok, amountCents: 100_000_001 })).toThrow()
  })

  it('rejects malformed email', () => {
    expect(() => createRequestBodySchema.parse({ ...ok, toEmail: 'not-an-email' })).toThrow()
  })

  it('rejects an oversized note', () => {
    const longNote = 'x'.repeat(281)
    expect(() => createRequestBodySchema.parse({ ...ok, note: longNote })).toThrow()
  })

  it('accepts an empty optional note', () => {
    expect(() => createRequestBodySchema.parse({ ...ok, note: undefined })).not.toThrow()
  })
})
