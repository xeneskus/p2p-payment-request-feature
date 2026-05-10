import { expect, test } from '@playwright/test'
import { TEST_PASSWORD, makeTestEmail, registerNewUser, signIn, signOut } from './helpers'

test.describe('Authentication', () => {
  test('register, sign out, sign in', async ({ page }) => {
    const email = await registerNewUser(page, 'auth')
    await expect(page).toHaveURL(/\/dashboard$/)
    await signOut(page)
    await expect(page).toHaveURL(/\/login/)
    await signIn(page, email)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('unauthenticated visitor to /dashboard is redirected to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('rejects malformed credentials', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Email').fill('not-an-email')
    await page.getByLabel('Password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.locator('.text-destructive').first()).toBeVisible({ timeout: 10_000 })
  })

  test('rejects too-short password', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Email').fill(makeTestEmail('short'))
    await page.getByLabel('Password').fill('short')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText(/8 characters/i)).toBeVisible()
  })
})
