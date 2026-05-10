export const MAX_AMOUNT_CENTS = 100_000_000

export class MoneyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoneyError'
  }
}

export class Money {
  private constructor(private readonly _cents: number) {}

  static fromCents(value: number): Money {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new MoneyError('amount must be an integer number of cents')
    }
    if (value <= 0) {
      throw new MoneyError('amount must be greater than zero')
    }
    if (value > MAX_AMOUNT_CENTS) {
      throw new MoneyError(`amount exceeds the ${MAX_AMOUNT_CENTS} cent upper bound`)
    }
    return new Money(value)
  }

  static fromDollars(input: string): Money {
    const trimmed = input.trim()
    if (trimmed === '') {
      throw new MoneyError('amount is required')
    }
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
      throw new MoneyError('amount must be a non-negative number with at most two decimal places')
    }
    const [whole, fraction = ''] = trimmed.split('.')
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
    return Money.fromCents(cents)
  }

  get cents(): number {
    return this._cents
  }

  format(): string {
    const dollars = (this._cents / 100).toFixed(2)
    return `$${dollars}`
  }
}
