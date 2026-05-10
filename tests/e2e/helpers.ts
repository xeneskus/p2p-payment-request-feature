import type { Page } from '@playwright/test'

export const TEST_PASSWORD = 'testpass123'

export function makeTestEmail(role: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  return `${role}-${suffix}@example.test`
}

export async function registerNewUser(page: Page, role: string): Promise<string> {
  const email = makeTestEmail(role)
  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL('**/dashboard', { timeout: 15_000 })
  return email
}

export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/dashboard', { timeout: 15_000 })
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL('**/login', { timeout: 15_000 })
}

export async function createRequest(
  page: Page,
  args: { toEmail: string; amountDollars: string; note?: string },
): Promise<void> {
  await page.getByRole('link', { name: /New request/i }).click()
  await page.waitForURL('**/requests/new')
  await page.getByLabel('Recipient email').fill(args.toEmail)
  await page.getByLabel('Amount (USD)').fill(args.amountDollars)
  if (args.note) {
    await page.getByLabel(/Note/).fill(args.note)
  }
  await page.getByRole('button', { name: 'Send request' }).click()
  await page.waitForURL('**/dashboard', { timeout: 15_000 })
}
