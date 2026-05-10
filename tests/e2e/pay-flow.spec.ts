import { expect, test } from '@playwright/test'
import { TEST_PASSWORD, createRequest, registerNewUser, signIn, signOut } from './helpers'

test.describe('Pay flow', () => {
  test('recipient sees the incoming request and can pay it', async ({ page }) => {
    // 1. Sender registers (so we have a real account email).
    const senderEmail = await registerNewUser(page, 'sender')
    await signOut(page)

    // 2. Recipient registers (so their session sees the request).
    const recipientEmail = senderEmail.replace('sender', 'recipient')
    await page.goto('/register')
    await page.getByLabel('Email').fill(recipientEmail)
    await page.getByLabel('Password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Create account' }).click()
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    await signOut(page)

    // 3. Sender signs back in and creates the request.
    await signIn(page, senderEmail)
    await createRequest(page, {
      toEmail: recipientEmail,
      amountDollars: '40',
      note: 'Concert tickets',
    })
    await signOut(page)

    // 4. Recipient signs in, opens the incoming list.
    await signIn(page, recipientEmail)
    await page.getByRole('tab', { name: 'Incoming' }).click()
    await expect(page.getByText('$40.00').first()).toBeVisible({ timeout: 15_000 })

    // 5. Open the detail row and pay. `data-testid` is on the row anchor;
    // a generic `a[href^="/requests/"]` selector would also match the "New
    // request" link in the dashboard header.
    await page.getByTestId('payment-request-row').first().click()
    await page.getByRole('button', { name: 'Pay', exact: true }).click()
    await page.getByRole('button', { name: 'Confirm payment' }).click()

    // 6. Success page after the 2.5s simulated settlement.
    await page.waitForURL(/\/success$/, { timeout: 15_000 })
    await expect(page.getByText('Payment sent')).toBeVisible()
    await expect(page.getByText('$40.00')).toBeVisible()
  })
})
