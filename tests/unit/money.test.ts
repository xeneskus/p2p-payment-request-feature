import { describe, expect, it } from 'vitest'
import { Money, MoneyError, MAX_AMOUNT_CENTS } from '@/lib/money'

describe('Money', () => {
  describe('fromCents', () => {
    it('accepts a positive integer', () => {
      const m = Money.fromCents(4000)
      expect(m.cents).toBe(4000)
    })

    it('rejects zero', () => {
      expect(() => Money.fromCents(0)).toThrow(MoneyError)
    })

    it('rejects a negative integer', () => {
      expect(() => Money.fromCents(-1)).toThrow(MoneyError)
    })

    it('rejects a non-integer', () => {
      expect(() => Money.fromCents(40.5)).toThrow(MoneyError)
    })

    it('rejects NaN', () => {
      expect(() => Money.fromCents(Number.NaN)).toThrow(MoneyError)
    })

    it('rejects values above the upper bound', () => {
      expect(() => Money.fromCents(MAX_AMOUNT_CENTS + 1)).toThrow(MoneyError)
    })

    it('accepts exactly the upper bound', () => {
      const m = Money.fromCents(MAX_AMOUNT_CENTS)
      expect(m.cents).toBe(MAX_AMOUNT_CENTS)
    })
  })

  describe('fromDollars', () => {
    it('converts a whole-dollar string to cents', () => {
      expect(Money.fromDollars('40').cents).toBe(4000)
    })

    it('converts a two-decimal string to cents', () => {
      expect(Money.fromDollars('40.25').cents).toBe(4025)
    })

    it('rejects a value with more than two decimals', () => {
      expect(() => Money.fromDollars('40.123')).toThrow(MoneyError)
    })

    it('rejects negative input', () => {
      expect(() => Money.fromDollars('-1')).toThrow(MoneyError)
    })

    it('rejects non-numeric input', () => {
      expect(() => Money.fromDollars('abc')).toThrow(MoneyError)
    })

    it('rejects empty input', () => {
      expect(() => Money.fromDollars('')).toThrow(MoneyError)
    })

    it('accepts numeric input with leading/trailing whitespace', () => {
      expect(Money.fromDollars('  40.00  ').cents).toBe(4000)
    })
  })

  describe('format', () => {
    it('formats cents as a USD string with two decimals', () => {
      expect(Money.fromCents(4000).format()).toBe('$40.00')
      expect(Money.fromCents(4025).format()).toBe('$40.25')
      expect(Money.fromCents(1).format()).toBe('$0.01')
    })
  })
})
