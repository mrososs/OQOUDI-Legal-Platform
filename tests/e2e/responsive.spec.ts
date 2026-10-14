import { expect, test } from '@playwright/test'
import { open, signIn } from './support'

/** Mobile (Pixel 7) layout checks: no horizontal scroll, collapsible navigation. */
const pages = ['/', '/services', '/service/contract-drafting', '/about', '/faq', '/contact', '/auth/login', '/en', '/en/services']

for (const path of pages) {
  test(`no horizontal overflow on ${path}`, async ({ page }) => {
    await open(page, path)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
}

test('header collapses into a menu on mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile layout only')
  await open(page, '/')
  await expect(page.getByRole('navigation', { name: 'القائمة الرئيسية' })).toBeHidden()
  await page.getByRole('button', { name: 'القائمة' }).click()
  await expect(page.locator('#mobile-menu')).toBeVisible()
  await page.locator('#mobile-menu').getByRole('link', { name: 'الأسئلة الشائعة' }).click()
  await expect(page).toHaveURL(/\/faq$/)
})

test('document direction follows the locale', async ({ page }) => {
  await open(page, '/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', /^ar/)
  await open(page, '/en')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
})

test('client portal is usable on mobile', async ({ page }) => {
  await signIn(page, 'ahmed@oqoudi.test')
  await open(page, '/account/orders')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
