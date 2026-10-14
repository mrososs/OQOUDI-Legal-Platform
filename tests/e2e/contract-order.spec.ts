import { expect, test } from '@playwright/test'
import { linkFromEmail, open, PASSWORD, uniqueEmail } from './support'

/**
 * Primary journey (presentation slide 49, journey 1 — customer side):
 * register → confirm email → discover service → dynamic form + upload →
 * review → pay (dev simulator) → server-verified confirmation → portal.
 */
test('a new customer orders contract drafting end to end', async ({ page }) => {
  const email = uniqueEmail('e2e')

  // --- Register (company account) and confirm the email address
  await open(page, '/auth/register')
  await page.getByLabel('الاسم الكامل').fill('سلمى عبد الرحمن')
  await page.getByRole('radio', { name: 'شركة' }).click()
  await page.getByLabel('اسم الشركة').fill('شركة الاختبار المحدودة')
  await page.getByLabel('رقم الهاتف').fill('01001234567')
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByLabel('كلمة المرور').fill(PASSWORD)
  await page.getByRole('button', { name: 'إنشاء الحساب' }).click()
  await expect(page.getByText('أكّد بريدك الإلكتروني')).toBeVisible()

  const confirmLink = await linkFromEmail(email, /http:\/\/127\.0\.0\.1:55321\/auth\/v1\/verify\?[^"'\s<>]+/)
  await page.goto(confirmLink)
  await expect(page).toHaveURL(/\/account/)
  await expect(page.getByText('حساب عميل · شركة')).toBeVisible()

  // --- Discover the service from the public site
  await open(page, '/services/companies')
  await page.getByRole('link', { name: 'صياغة عقد' }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'صياغة عقد' })).toBeVisible()
  await page.getByRole('checkbox', { name: /نسخة باللغة الإنجليزية/ }).click()
  await expect(page.getByText('٣٬٧٠٠ ج.م').first()).toBeVisible()
  await page.getByRole('link', { name: 'ابدأ الطلب' }).click()

  // --- Dynamic form: client-side validation first
  await expect(page.getByRole('heading', { name: 'طلب خدمة: صياغة عقد' })).toBeVisible()
  await page.getByRole('button', { name: 'متابعة إلى المراجعة' }).click()
  await expect(page.getByText(/يرجى مراجعة/)).toBeVisible()

  await page.getByLabel('اسم الطرف الأول').fill('شركة الاختبار المحدودة')
  await page.getByLabel('اسم الطرف الثاني').fill('مؤسسة النيل للتوريدات')
  await page.getByLabel('نوع العقد').selectOption('supply')
  await page.getByRole('radio', { name: 'العربية', exact: true }).click()
  await page.getByLabel('وصف موضوع العقد').fill('توريد مستلزمات مكتبية شهريًا لمدة سنة، والدفع خلال ثلاثين يومًا من الفاتورة.')
  await page.getByRole('checkbox', { name: 'التحكيم' }).click()
  await page.locator('input[type=file]').setInputFiles({
    name: 'عرض-سعر.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n% e2e test file\n%%EOF\n'),
  })
  await expect(page.getByText('عرض-سعر.pdf')).toBeVisible()
  await expect(page.getByText('جارٍ الرفع…')).toHaveCount(0)

  await page.getByRole('button', { name: 'متابعة إلى المراجعة' }).click()

  // --- Review & pay
  await expect(page.getByRole('heading', { name: 'مراجعة بيانات الطلب' })).toBeVisible()
  await expect(page.getByText('مؤسسة النيل للتوريدات')).toBeVisible()
  await expect(page.getByText('عقد توريد')).toBeVisible()
  await page.getByRole('button', { name: /ادفع ٣٬٧٠٠ ج\.م/ }).click()

  // --- Hosted payment page (development simulator)
  await expect(page).toHaveURL(/\/dev\/payment-simulator\//)
  await expect(page.getByText('محاكي دفع لبيئة التطوير فقط', { exact: false })).toBeVisible()
  await page.getByTestId('sim-success').click()

  // --- Confirmation reflects the server state (webhook-confirmed)
  await expect(page).toHaveURL(/\/checkout\/DQ-\d+\/confirmation/)
  await expect(page.getByRole('heading', { name: 'تم الدفع واستلام طلبك' })).toBeVisible()
  await expect(page.getByText(/RC-\d+/)).toBeVisible()
  const orderNumber = (await page.locator('dd.ltr').first().textContent())?.trim()
  expect(orderNumber).toMatch(/^DQ-\d+$/)

  // --- The order is in the portal
  await page.getByRole('link', { name: /متابعة الطلب في حسابي/ }).click()
  await expect(page).toHaveURL(new RegExp(`/account/orders/${orderNumber}`))
  await expect(page.getByText('صياغة عقد').first()).toBeVisible()
})

test('a failed payment keeps the order and allows retry', async ({ page }) => {
  const email = uniqueEmail('e2e-fail')
  await open(page, '/auth/register')
  await page.getByLabel('الاسم الكامل').fill('كريم عادل')
  await page.getByLabel('رقم الهاتف').fill('01111234567')
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByLabel('كلمة المرور').fill(PASSWORD)
  await page.getByRole('button', { name: 'إنشاء الحساب' }).click()
  await page.goto(await linkFromEmail(email, /http:\/\/127\.0\.0\.1:55321\/auth\/v1\/verify\?[^"'\s<>]+/))
  await expect(page).toHaveURL(/\/account/)

  await open(page, '/service/legal-notice/request')
  await page.getByLabel('موضوع الإنذار').selectOption('payment')
  await page.getByLabel('اسم المُنذَر إليه').fill('محمد علي')
  await page.getByLabel('الوقائع').fill('حرر المنذر إليه إيصال أمانة بمبلغ مستحق ولم يقم بالسداد حتى تاريخه.')
  await page.getByRole('button', { name: 'متابعة إلى المراجعة' }).click()
  await page.getByRole('button', { name: /ادفع/ }).click()
  await page.getByTestId('sim-failure').click()

  await expect(page.getByRole('heading', { name: 'لم يكتمل الدفع' })).toBeVisible()
  await page.getByRole('link', { name: 'إعادة محاولة الدفع' }).click()
  await expect(page.getByText('تعذّر إتمام الدفع')).toBeVisible()
  await page.getByRole('button', { name: /إعادة المحاولة/ }).click()
  await page.getByTestId('sim-success').click()
  await expect(page.getByRole('heading', { name: 'تم الدفع واستلام طلبك' })).toBeVisible()
})
