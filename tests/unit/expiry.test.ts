import { describe, expect, it } from 'vitest'
import { effectiveStatus, isExpired } from '@/lib/expiry'

const past = new Date('2026-01-01T00:00:00Z').toISOString()
const future = new Date('2099-12-31T23:59:59Z').toISOString()
const now = new Date('2026-05-11T00:00:00Z')

describe('isExpired', () => {
  it('is true when expires_at is in the past', () => {
    expect(isExpired(past, now)).toBe(true)
  })

  it('is false when expires_at is in the future', () => {
    expect(isExpired(future, now)).toBe(false)
  })
})

describe('effectiveStatus', () => {
  it('reports `expired` for a pending row past its expiry', () => {
    expect(effectiveStatus({ status: 'pending', expires_at: past }, now)).toBe('expired')
  })

  it('keeps `pending` for a pending row not yet expired', () => {
    expect(effectiveStatus({ status: 'pending', expires_at: future }, now)).toBe('pending')
  })

  it('does not change terminal `paid`, even past expiry', () => {
    expect(effectiveStatus({ status: 'paid', expires_at: past }, now)).toBe('paid')
  })

  it('does not change terminal `declined`', () => {
    expect(effectiveStatus({ status: 'declined', expires_at: past }, now)).toBe('declined')
  })

  it('does not change terminal `cancelled`', () => {
    expect(effectiveStatus({ status: 'cancelled', expires_at: past }, now)).toBe('cancelled')
  })

  it('treats `expired` as a terminal pass-through', () => {
    expect(effectiveStatus({ status: 'expired', expires_at: past }, now)).toBe('expired')
  })
})
