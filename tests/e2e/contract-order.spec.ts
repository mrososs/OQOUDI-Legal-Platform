import { deflateSync } from 'node:zlib'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { newCustomer } from '../integration/helpers'
import { linkFromEmail, open, PASSWORD, signIn, uniqueEmail } from './support'

/**
 * Primary journey with manual payment verification:
 * register → confirm email → discover service → dynamic form + upload →
 * review → manual checkout (InstaPay + proof) → pending review →
 * admin approves in the dashboard → customer sees the order started.
 */

/** Minimal valid PNG for proof uploads (no binary fixtures in the repo). */
function png(): Buffer {
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (b: Buffer) => {
    let c = 0xFFFFFFFF
    for (const x of b) c = table[(c ^ x) & 0xFF]! ^ (c >>> 8)
    return (c ^ 0xFFFFFFFF) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const sum = Buffer.alloc(4)
    sum.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, sum])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(8, 0)
  ihdr.writeUInt32BE(8, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const raw = Buffer.alloc((8 * 3 + 1) * 8, 0x80)
  for (let y = 0; y < 8; y++) raw[y * 25] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

async function adminPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ locale: 'ar-EG', timezoneId: 'Africa/Cairo' })
  const page = await ctx.newPage()
  await signIn(page, 'admin@oqoudi.test')
  return page
}

/** Opens the admin review panel for an order number. */
async function openReview(admin: Page, orderNumber: string) {
  await open(admin, `/dashboard/payments?q=${orderNumber}`)
  const row = admin.getByRole('row').filter({ hasText: orderNumber })
  await row.getByRole('button', { name: 'مراجعة' }).click()
  const panel = admin.getByRole('dialog', { name: orderNumber })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('img', { name: 'معاينة صورة إثبات التحويل' })).toBeVisible()
  return panel
}

async function createLegalNoticeViaUi(page: Page) {
  await open(page, '/service/legal-notice/request')
  await page.getByLabel('موضوع الإنذار').selectOption('payment')
  await page.getByLabel('اسم المُنذَر إليه').fill('محمد علي')
  await page.getByLabel('الوقائع').fill('حرر المنذر إليه إيصال أمانة بمبلغ مستحق ولم يقم بالسداد حتى تاريخه.')
  await page.getByRole('button', { name: 'متابعة إلى المراجعة' }).click()
  await page.getByRole('button', { name: /متابعة إلى الدفع/ }).click()
  await expect(page).toHaveURL(/\/checkout\/DQ-\d+$/)
  return page.url().split('/').pop()!
}

test('a new customer orders contract drafting, pays by InstaPay proof and an admin approves', async ({ page, browser }) => {
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

  // --- Review → create the order → manual checkout
  await expect(page.getByRole('heading', { name: 'مراجعة بيانات الطلب' })).toBeVisible()
  await expect(page.getByText('مؤسسة النيل للتوريدات')).toBeVisible()
  await page.getByRole('button', { name: /متابعة إلى الدفع · ٣٬٧٠٠ ج\.م/ }).click()
  await expect(page).toHaveURL(/\/checkout\/DQ-\d+$/)
  const orderNumber = page.url().split('/').pop()!
  await expect(page.getByText('جميع عمليات الدفع وإثباتات التحويل للعرض فقط')).toBeVisible()

  // Step 2–3: InstaPay instructions with the configured destination and the exact amount.
  await page.getByRole('radio', { name: /إنستاباي/ }).click()
  await expect(page.getByText('01006816005')).toBeVisible()
  await expect(page.getByText('٣٬٧٠٠ ج.م').first()).toBeVisible()
  const submit = page.getByRole('button', { name: 'إرسال إثبات الدفع للمراجعة' })
  await expect(submit).toBeDisabled()

  // Step 4: proof upload with preview.
  await page.locator('input[type=file]').setInputFiles({ name: 'instapay-proof.png', mimeType: 'image/png', buffer: png() })
  await expect(page.getByRole('img', { name: 'معاينة صورة إثبات التحويل' })).toBeVisible()

  // Step 5: submit → status screen (not paid yet).
  await submit.click()
  await expect(page).toHaveURL(new RegExp(`/checkout/${orderNumber}/confirmation`))
  await expect(page.getByRole('heading', { level: 1, name: 'جاري مراجعة الدفع' })).toBeVisible()
  await expect(page.getByText('تم إرسال إثبات الدفع بنجاح').first()).toBeVisible()

  await open(page, `/account/orders/${orderNumber}`)
  await expect(page.getByRole('heading', { name: 'جاري مراجعة الدفع' })).toBeVisible()
  await expect(page.getByText('بانتظار الدفع').first()).toBeVisible()

  // --- Admin approves
  const admin = await adminPage(browser)
  const panel = await openReview(admin, orderNumber)
  await expect(panel.getByText('٣٬٧٠٠ ج.م').first()).toBeVisible()
  await panel.getByRole('button', { name: 'الموافقة على الدفع' }).click()
  const confirm = admin.getByRole('dialog', { name: 'تأكيد الموافقة على الدفع' })
  await confirm.getByRole('button', { name: 'الموافقة على الدفع' }).click()
  await expect(admin.getByText('تمت الموافقة على الدفع وبدأ تنفيذ الخدمة بنجاح.')).toBeVisible()
  await expect(panel.getByText('مقبول')).toBeVisible()
  await admin.context().close()

  // --- Customer sees the order started
  await open(page, `/account/orders/${orderNumber}`)
  await expect(page.getByRole('heading', { name: 'تم قبول الدفع وبدأ تنفيذ الخدمة' })).toBeVisible()
  await expect(page.getByText(/DEMO-RC-\d+/).first()).toBeVisible()
})

test('an admin rejection keeps the order blocked and the customer is told', async ({ page, browser }) => {
  const customer = await newCustomer('e2e-reject')
  await signIn(page, customer.email)
  const orderNumber = await createLegalNoticeViaUi(page)

  // Vodafone Cash with the generated, clearly labelled demo proof.
  await page.getByRole('radio', { name: /فودافون كاش/ }).click()
  await expect(page.getByText('01006816005')).toBeVisible()
  await page.getByRole('button', { name: 'استخدام صورة إثبات تجريبية' }).click()
  await expect(page.getByRole('img', { name: 'معاينة صورة إثبات التحويل' })).toBeVisible()
  await page.getByRole('button', { name: 'إرسال إثبات الدفع للمراجعة' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'جاري مراجعة الدفع' })).toBeVisible()

  const admin = await adminPage(browser)
  const panel = await openReview(admin, orderNumber)
  await panel.getByRole('button', { name: 'رفض الدفع' }).click()
  const dialog = admin.getByRole('dialog', { name: 'رفض إثبات الدفع' })
  await dialog.getByLabel('سبب الرفض (اختياري)').fill('لم يصل المبلغ إلى المحفظة')
  await dialog.getByRole('button', { name: 'رفض الدفع' }).click()
  await expect(admin.getByText('تم رفض إثبات الدفع وإشعار العميل.')).toBeVisible()
  await admin.context().close()

  await open(page, `/account/orders/${orderNumber}`)
  await expect(page.getByRole('heading', { name: 'لم تتم الموافقة على الدفع' })).toBeVisible()
  await expect(page.getByText('برجاء التواصل معنا إذا كنت تواجه أي مشاكل')).toBeVisible()
  await expect(page.getByText('لم يصل المبلغ إلى المحفظة')).toBeVisible()
  await expect(page.getByRole('link', { name: 'تواصل معنا' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'إرسال إثبات جديد' })).toBeVisible()
})

test('PayPal shows the demo placeholder and invalid files are refused inline', async ({ page }) => {
  const customer = await newCustomer('e2e-paypal')
  await signIn(page, customer.email)
  await createLegalNoticeViaUi(page)

  await page.getByRole('radio', { name: /باي بال/ }).click()
  await expect(page.getByText('demo@example.invalid')).toBeVisible()
  await expect(page.getByText('حساب تجريبي — غير متاح للتحويلات الحقيقية.')).toBeVisible()

  const input = page.locator('input[type=file]')
  await input.setInputFiles({ name: 'receipt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
  await expect(page.getByText('نوع الملف غير مدعوم. ارفع صورة PNG أو JPG أو WEBP.').first()).toBeVisible()
  await input.setInputFiles({ name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 1) })
  await expect(page.getByText('حجم الصورة أكبر من ٥ ميجابايت. اختر صورة أصغر.').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'إرسال إثبات الدفع للمراجعة' })).toBeDisabled()
})
