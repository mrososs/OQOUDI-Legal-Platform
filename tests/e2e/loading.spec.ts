import { expect, test, type Page } from '@playwright/test'
import { open } from './support'

/** The branded logo loader (components/layout/GlobalLoading.vue) driven by routing and endpoint calls. */
const overlay = (page: Page) => page.locator('.loading--overlay')
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

test('a slow navigation shows the logo loader without blocking clicks, then clears', async ({ page }) => {
  await open(page, '/about')
  // Entering the directory fetches the catalog on the client: hold that call back.
  await page.route('**/rest/v1/service_categories**', async (route) => {
    await delay(1800)
    await route.continue()
  })
  await page.getByRole('navigation', { name: 'القائمة الرئيسية' }).getByRole('link', { name: 'خدمات الأفراد' }).click()

  const loader = overlay(page)
  await expect(loader).toBeVisible()
  await expect(loader.locator('img.mark')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'جارٍ التحميل' }).first()).toBeAttached()
  // A navigation never swallows clicks: only a pending write does.
  await expect(loader).not.toHaveAttribute('data-blocking')
  await expect(page.getByRole('heading', { level: 1, name: 'خدمات الأفراد' })).toBeVisible()
  await expect(loader).toBeHidden()
})

test('a pending write puts the loader over the page and blocks it until it settles', async ({ page }) => {
  await open(page, '/auth/login')
  await page.route('**/auth/v1/token**', async (route) => {
    await delay(1800)
    await route.continue()
  })
  await page.getByLabel('البريد الإلكتروني').fill('nobody@test.oqoudi.local')
  await page.getByLabel('كلمة المرور').fill('Wrong-password-1')
  await page.getByRole('button', { name: 'دخول' }).click()

  const loader = overlay(page)
  await expect(loader).toBeVisible()
  await expect(loader).toHaveAttribute('data-blocking', 'true')
  await expect(loader).toBeHidden({ timeout: 15_000 })
})
