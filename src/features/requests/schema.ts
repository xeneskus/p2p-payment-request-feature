import { z } from 'zod'
import { MAX_AMOUNT_CENTS } from '@/lib/money'

const emailField = z.string().trim().toLowerCase().pipe(z.string().email())

export const credentialsSchema = z.object({
  email: emailField,
  password: z.string().min(8, 'password must be at least 8 characters'),
})
export type Credentials = z.infer<typeof credentialsSchema>

export const createRequestBodySchema = z.object({
  toEmail: emailField,
  amountCents: z
    .number()
    .int('amount must be an integer number of cents')
    .positive('amount must be greater than zero')
    .max(MAX_AMOUNT_CENTS, `amount must not exceed ${MAX_AMOUNT_CENTS} cents`),
  note: z.string().max(280, 'note must be 280 characters or fewer').optional(),
})
export type CreateRequestBody = z.infer<typeof createRequestBodySchema>

export const requestStatusSchema = z.enum(['pending', 'paid', 'declined', 'cancelled', 'expired'])
export type RequestStatusValue = z.infer<typeof requestStatusSchema>

export const listQuerySchema = z.object({
  direction: z.enum(['outgoing', 'incoming']),
  status: requestStatusSchema.optional(),
  q: z.string().trim().min(1).max(80).optional(),
})
export type ListQuery = z.infer<typeof listQuerySchema>
