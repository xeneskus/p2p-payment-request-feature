import { expect, test } from '@playwright/test'
import { createRequest, registerNewUser } from './helpers'

test.describe('Create payment request', () => {
  test('happy path: form → request appears in Outgoing', async ({ page }) => {
    await registerNewUser(page, 'sender')
    await createRequest(page, {
      toEmail: 'friend@example.test',
      amountDollars: '40',
      note: 'Concert tickets',
    })
    await expect(page).toHaveURL(/\/dashboard$/)
    // Outgoing tab is selected by default; just assert the new row.
    await expect(page.getByText('$40.00').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('friend@example.test').first()).toBeVisible()
  })

  test('rejects zero amount', async ({ page }) => {
    await registerNewUser(page, 'sender')
    await page.goto('/requests/new')
    await page.getByLabel('Recipient email').fill('friend@example.test')
    await page.getByLabel('Amount (USD)').fill('0')
    await page.getByRole('button', { name: 'Send request' }).click()
    await expect(page.getByText(/positive value|positive|greater than/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('rejects malformed recipient email', async ({ page }) => {
    await registerNewUser(page, 'sender')
    await page.goto('/requests/new')
    await page.getByLabel('Recipient email').fill('not-an-email')
    await page.getByLabel('Amount (USD)').fill('10')
    await page.getByRole('button', { name: 'Send request' }).click()
    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 10_000 })
  })

  test('rejects self-request', async ({ page }) => {
    const senderEmail = await registerNewUser(page, 'sender')
    await page.goto('/requests/new')
    await page.getByLabel('Recipient email').fill(senderEmail)
    await page.getByLabel('Amount (USD)').fill('10')
    await page.getByRole('button', { name: 'Send request' }).click()
    await expect(page.getByText(/yourself/i)).toBeVisible({ timeout: 10_000 })
  })
})
