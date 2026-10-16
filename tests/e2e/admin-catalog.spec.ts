import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { sql } from '../integration/helpers'
import { open, signIn } from './support'

/** Admin Service Editor with the 64-contract catalog: filters, launch pricing, add-ons, form builder, import status. */
const SHOTS = 'docs/catalog-import/screenshots'
mkdirSync(SHOTS, { recursive: true })
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png`, animations: 'disabled' })

test.beforeEach(async ({ page }) => {
  await signIn(page, 'admin@oqoudi.test')
})

test('the services list filters by main category, sub-category and search', async ({ page }) => {
  await open(page, '/dashboard/services')
  await expect(page.getByText(/من .+ خدمة/)).toBeVisible()

  const [companies] = await sql<{ id: string }>(`select id from public.service_categories where slug = 'companies'`)
  await open(page, `/dashboard/services?cat=${companies!.id}`)
  await expect(page.getByText('٣٥ من ')).toBeVisible() // 32 contracts + the 3 retained generic services whose primary category is companies

  const [rentals] = await sql<{ id: string, parent_id: string }>(`select id, parent_id from public.service_categories where slug = 'rentals'`)
  await open(page, `/dashboard/services?cat=${rentals!.parent_id}&sub=${rentals!.id}`)
  await expect(page.getByText('٤ من ')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'عقد إيجار محل تجاري' })).toBeVisible()
  await shot(page, 'admin-services-filtered')

  await open(page, '/dashboard/services?q=CO-002')
  await expect(page.getByRole('row').filter({ hasText: 'اتفاقية المساهمين والشركاء' })).toBeVisible()
  await expect(page.getByText('الترجمة الإنجليزية قيد المراجعة').first()).toBeVisible()
  await expect(page.getByText('الإطلاق: ٢٬٥٠٠ ج.م')).toBeVisible()
})

test('the editor shows launch pricing, add-ons without a regular price and hierarchical categories', async ({ page }) => {
  const [svc] = await sql<{ id: string }>(`select id from public.services where slug = 'shareholders-agreement'`)

  await open(page, `/dashboard/services/${svc!.id}?tab=pricing`)
  await expect(page.getByLabel('سعر الإطلاق (ج.م)')).toHaveValue('2500')
  await expect(page.getByRole('switch', { name: 'ضمن عرض الإطلاق' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('لا يوجد سعر عادي معتمد: تظهر هذه الإضافة أثناء حملة الإطلاق فقط.')).toBeVisible()
  await shot(page, 'admin-editor-pricing')

  await open(page, `/dashboard/services/${svc!.id}?tab=basics`)
  await expect(page.getByLabel('التصنيف الرئيسي')).toContainText('خدمات الشركات › التأسيس والشراكات')
  await expect(page.getByLabel('حالة الترجمة الإنجليزية')).toHaveValue('pending_review')
})

test('the form builder edits repeater columns and flags fields pending legal review; the preview works', async ({ page }) => {
  const [svc] = await sql<{ id: string }>(`select id from public.services where slug = 'shareholders-agreement'`)
  await open(page, `/dashboard/services/${svc!.id}?tab=form`)
  await expect(page.getByText('هيكل الملكية').first()).toBeVisible()
  await page.getByRole('button', { name: /هيكل الملكية/ }).first().click()
  await expect(page.getByText('أعمدة القائمة')).toBeVisible()
  await expect(page.getByLabel('عنوان العمود').first()).toBeVisible()
  await expect(page.getByText('مراجعة').first()).toBeVisible() // legal-review badge on uncertain fields
  await shot(page, 'admin-editor-form-builder')
  await page.getByRole('button', { name: 'معاينة' }).click()
  await expect(page.getByRole('group', { name: /هيكل الملكية/ })).toBeVisible()
})

test('the import status panel lists the imported contracts', async ({ page }) => {
  await open(page, '/dashboard/catalog-import')
  await expect(page.getByRole('heading', { level: 1, name: 'استيراد الكتالوج' })).toBeVisible()
  await expect(page.getByRole('button', { name: /تم إنشاؤه/ })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'IND-001' })).toBeVisible()
  await shot(page, 'admin-catalog-import')
})
