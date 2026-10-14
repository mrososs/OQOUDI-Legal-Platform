import { expect, test } from '@playwright/test'
import { createLegalNoticeOrder, newCustomer, payOrder } from '../integration/helpers'
import { open, PASSWORD, signIn } from './support'

/**
 * Journey 1 — lawyer side + customer decision, through the UI:
 * paid order → lawyer uploads & delivers v1 from the dashboard →
 * customer sees and downloads it, accepts → rates the service.
 */
test('lawyer delivers from the dashboard, customer accepts and rates', async ({ browser }) => {
  const customer = await newCustomer('e2e-deliver')
  const order = await createLegalNoticeOrder(customer)
  await payOrder(customer, order.id)

  // --- Lawyer (auto-assigned on payment)
  const lawyerCtx = await browser.newContext({ locale: 'ar-EG', timezoneId: 'Africa/Cairo' })
  const lawyer = await lawyerCtx.newPage()
  await signIn(lawyer, 'karim@oqoudi.test')
  await open(lawyer, `/dashboard/requests/${order.orderNumber}`)
  await expect(lawyer.getByRole('heading', { name: 'التسليمات' })).toBeVisible()
  await lawyer.locator('input[type=file]').first().setInputFiles({
    name: 'إنذار-رسمي-v1.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n% delivered by e2e\n%%EOF\n'),
  })
  await expect(lawyer.getByText('إنذار-رسمي-v1.pdf')).toBeVisible()
  await expect(lawyer.getByText('جارٍ الرفع…')).toHaveCount(0)
  await lawyer.getByRole('button', { name: 'تسليم الإصدار ١ للعميل' }).click()
  await expect(lawyer.getByText('بانتظار قرار العميل', { exact: false }).first()).toBeVisible()
  await lawyerCtx.close()

  // --- Customer
  const customerCtx = await browser.newContext({ locale: 'ar-EG', timezoneId: 'Africa/Cairo' })
  const page = await customerCtx.newPage()
  await signIn(page, customer.email, PASSWORD)
  await open(page, `/account/orders/${order.orderNumber}`)
  await expect(page.getByText('الإصدار ١').first()).toBeVisible()
  await expect(page.getByText('إنذار-رسمي-v1.pdf')).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /تحميل إنذار-رسمي-v1\.pdf/ }).click()
  expect((await download).suggestedFilename()).toBe('إنذار-رسمي-v1.pdf')

  await page.getByRole('button', { name: 'قبول التسليم' }).first().click()
  await expect(page.getByRole('dialog', { name: 'تقييم الخدمة' })).toBeVisible()
  await page.getByRole('radio', { name: '٥ من ٥ نجوم' }).click()
  await page.getByLabel('رأيك المكتوب (اختياري)').fill('إنذار واضح ودقيق، شكرًا.')
  await page.getByRole('button', { name: 'نشر التقييم' }).click()
  await expect(page.getByText('تقييمك:')).toBeVisible()
  await customerCtx.close()
})
