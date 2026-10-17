import { mkdirSync } from 'node:fs'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { DISPLAY_ONLY_TYPES, formFieldsSchema, type FormField } from '../../shared/domain/formSchema'
import { newCustomer, service, sql } from '../integration/helpers'
import { open, signIn } from './support'

/**
 * The 64-contract catalog and the launch campaign, as users meet them.
 * Serial on purpose: the campaign is global state; every test leaves it DISABLED.
 */
const SHOTS = 'docs/catalog-import/screenshots'
mkdirSync(SHOTS, { recursive: true })
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png`, animations: 'disabled' })

const BANNER_TITLE = 'بمناسبة إطلاق منصة عقودي 🎉 خصم 50% على العقود لمدة 15 يوم فقط!'
const SUPPORT = 'ابدأ إجراءاتك القانونية الآن واستفد من عرض الإطلاق لفترة محدودة.'
const BANNER_CTA = 'اكتشف العقود المشمولة بالعرض'
const banner = (page: Page) => page.getByRole('region', { name: /عرض إطلاق منصة عقودي|OQOUDI launch offer/ })

async function disableCampaign() {
  await sql(`update public.platform_settings set value = jsonb_build_object('enabled', false, 'durationDays', 15, 'timezone', 'Africa/Cairo', 'startDate', null, 'startTime', '00:00', 'startsAt', null, 'endsAt', null) where key = 'pricing.launch_campaign'`)
}
async function activateCampaignInDb(endsInSeconds?: number) {
  await sql(`update public.platform_settings set value = jsonb_build_object('enabled', true, 'durationDays', 15, 'timezone', 'Africa/Cairo', 'startDate', null, 'startTime', '00:00', 'startsAt', now() - interval '1 day', 'endsAt', ${endsInSeconds ? `now() + interval '${endsInSeconds} seconds'` : `now() + interval '14 days'`}) where key = 'pricing.launch_campaign'`)
}
const cairoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

test.beforeEach(disableCampaign)
test.afterAll(disableCampaign)

async function adminPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ locale: 'ar-EG', timezoneId: 'Africa/Cairo' })
  const page = await ctx.newPage()
  await signIn(page, 'admin@oqoudi.test')
  return page
}

/** Fills the REQUIRED inputs of a published form through the real UI (all field types the contracts use). */
async function fillRequired(page: Page, fields: FormField[]) {
  const fileFields = fields.filter(f => f.type === 'file')
  for (const f of fields) {
    if (DISPLAY_ONLY_TYPES.includes(f.type) || !f.required || f.type === 'file') continue
    const label = f.label.ar
    const byLabel = () => page.getByLabel(new RegExp(`^${esc(label)}(\\s*\\*)?$`)).first()
    switch (f.type) {
      case 'text': await byLabel().fill('نص تجريبي'); break
      case 'textarea': await byLabel().fill('وصف تجريبي للاختبار'); break
      case 'number': await byLabel().fill(String(Math.min(f.max ?? 100000, Math.max(f.min ?? 0, 10)))); break
      case 'date': await byLabel().fill('2026-12-01'); break
      case 'select': await byLabel().selectOption(f.options![0]!.value); break
      case 'radio': await page.getByRole('radio', { name: f.options![0]!.label.ar, exact: true }).click(); break
      case 'repeater': {
        const group = page.getByRole('group', { name: new RegExp(`^${esc(label)}`) })
        for (let row = 0; row < Math.max(f.minItems ?? 1, 1); row++) {
          for (const col of f.columns ?? []) {
            if (!col.required) continue
            const cell = group.getByLabel(new RegExp(`^${esc(col.label.ar)}(\\s*\\*)?$`)).nth(row)
            if (col.type === 'select') await cell.selectOption(col.options![0]!.value)
            else if (col.type === 'date') await cell.fill('2026-12-01')
            else if (col.type === 'number') await cell.fill(String(Math.min(col.max ?? 100000, Math.max(col.min ?? 0, 5))))
            else await cell.fill(`قيمة تجريبية ${row + 1}`)
          }
        }
        break
      }
    }
  }
  const inputs = page.locator('input[type=file]')
  for (const [i, f] of fileFields.entries()) {
    if (!f.required) continue
    await inputs.nth(i).setInputFiles({ name: `${f.id}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% e2e test file\n%%EOF\n') })
    await expect(page.getByText(`${f.id}.pdf`)).toBeVisible()
  }
  await expect(page.getByText('جارٍ الرفع…')).toHaveCount(0)
}

async function formFor(slug: string): Promise<{ fields: FormField[], id: string }> {
  const [svc] = await sql<{ published_form_version_id: string }>('select published_form_version_id from public.services where slug = $1', [slug])
  const { data } = await service.from('service_form_versions').select('fields').eq('id', svc!.published_form_version_id).single()
  return { fields: formFieldsSchema.parse(data!.fields), id: svc!.published_form_version_id }
}

test.describe('browsing the hierarchy', () => {
  test('top-level → sub-category, accurate counts, search and price sorting', async ({ page }) => {
    await open(page, '/services/individuals')
    await expect(page.getByRole('heading', { level: 1, name: 'خدمات الأفراد' })).toBeVisible()
    // grouped by sub-category with accurate counts (the 32 contracts are not one flat list)
    for (const name of ['عقارات وبيع', 'إيجارات', 'الأحوال الشخصية والأسرة', 'العقود الرياضية والأكاديميات', 'العقود المدنية والتسويات', 'سيارات ومنقولات', 'تشطيبات ومقاولات', 'خدمات شخصية ومهنية']) {
      await expect(page.getByRole('heading', { level: 2, name: new RegExp(`^${esc(name)}`) })).toBeVisible()
    }
    await shot(page, 'directory-individuals-desktop')

    const nav = page.getByRole('navigation', { name: 'التصنيفات الفرعية' })
    await nav.getByRole('link', { name: /^إيجارات/ }).click()
    await expect(page).toHaveURL(/\/services\/individuals\/rentals$/)
    await expect(page.getByRole('heading', { level: 1, name: 'إيجارات' })).toBeVisible()
    await expect(page.locator('article.kh-card')).toHaveCount(4)
    await expect(page.getByText('٤ خدمة', { exact: true })).toBeVisible()

    // search inside the category
    await page.getByRole('searchbox').fill('محل')
    await page.getByRole('searchbox').press('Enter')
    await expect(page.locator('article.kh-card')).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'عقد إيجار محل تجاري' })).toBeVisible()

    // price sorting (low → high) by the price in force
    await open(page, '/services/individuals/rentals?sort=asc')
    const prices = await page.locator('article.kh-card .now').allInnerTexts()
    const nums = prices.map(p => Number(p.replace(/[^\d٠-٩]/g, '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))))
    expect(nums).toEqual([...nums].sort((a, b) => a - b))
  })

  test('a sub-category under the wrong parent is a 404; companies have nine sub-categories', async ({ page }) => {
    const res = await page.goto('/services/individuals/hr-and-employment')
    expect(res?.status()).toBe(404)
    await open(page, '/services/companies')
    await expect(page.getByRole('navigation', { name: 'التصنيفات الفرعية' }).getByRole('link')).toHaveCount(10) // "all" + 9
  })

  test('a service listed under both top-level categories is badged with the one being browsed', async ({ page }) => {
    // «صياغة عقد» is linked to Individuals and Companies but its primary category is Companies:
    // the Individuals page must not call it a company service.
    for (const [path, badge] of [['/services/individuals', 'خدمات الأفراد'], ['/services/companies', 'خدمات الشركات']] as const) {
      await open(page, path)
      const card = page.locator('article.kh-card', { has: page.getByRole('link', { name: 'صياغة عقد', exact: true }) })
      await expect(card.locator('.kh-badge').first()).toHaveText(badge)
    }
  })

  test('English LTR sub-category page', async ({ page }) => {
    await open(page, '/en/services/companies/hr-and-employment')
    await expect(page.getByRole('heading', { level: 1, name: 'HR & Employment' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(page.locator('article.kh-card')).toHaveCount(5)
    await shot(page, 'directory-companies-hr-en')
  })
})

test.describe('contract detail page (no campaign)', () => {
  test('shows what to prepare, documents and add-ons at regular prices; no offer', async ({ page }) => {
    await open(page, '/service/residential-apartment-sale-contract')
    await expect(page.getByRole('heading', { level: 1, name: 'عقد بيع شقة سكنية (ابتدائي / نهائي)' })).toBeVisible()
    await expect(banner(page)).toHaveCount(0)
    await expect(page.getByText('عرض خاص بمناسبة إطلاق منصة عقودي')).toHaveCount(0)
    // breadcrumb with main category and sub-category
    await expect(page.getByRole('navigation', { name: 'مسار التنقل' }).getByRole('link', { name: 'عقارات وبيع' })).toBeVisible()
    // requirements derived from the published form
    const req = page.locator('#sec-requirements')
    await expect(req.getByRole('heading', { name: 'ما الذي تحتاج إلى تجهيزه' })).toBeVisible()
    await expect(req.getByText('إيصال مرافق حديث')).toBeVisible()
    await expect(req.getByText('الشرط الجزائي عند التأخير أو الفسخ')).toBeVisible()
    await expect(req.getByText('اختياري').first()).toBeVisible()
    // VIP add-on: regular price = supplied total with VIP (3,750) − original (2,500) = 1,250
    const vip = page.getByRole('checkbox', { name: /تسليم VIP خلال 6 ساعات/ })
    await expect(vip).toContainText('١٬٢٥٠')
    await vip.click()
    await expect(page.locator('.total-value')).toContainText('٣٬٧٥٠')
    await expect(page.getByRole('link', { name: 'ابدأ الطلب' })).toBeVisible()
    await shot(page, 'detail-individual-regular')
  })

  test('company contract offers bilingual drafting; VIP is not offered outside the launch offer', async ({ page }) => {
    await open(page, '/service/shareholders-agreement')
    await expect(page.getByRole('checkbox', { name: /صياغة العقد باللغتين العربية والإنجليزية/ })).toContainText('٢٬٧٥٠')
    await expect(page.getByRole('checkbox', { name: /تسليم VIP/ })).toHaveCount(0) // no approved post-promotion VIP price
    await expect(page.getByText('صياغة بالعربية والإنجليزية متاحة')).toBeVisible()
    await shot(page, 'detail-company-regular')
  })

  test('English page flags the translation as pending legal review', async ({ page }) => {
    await open(page, '/en/service/shareholders-agreement')
    await expect(page.getByText(/pending legal review/)).toBeVisible()
  })
})

test.describe('order an individual contract with VIP delivery (regular price) and pay by proof', () => {
  test('required form → review → checkout amount equals the server price → admin sees the VIP order', async ({ page, browser }) => {
    test.setTimeout(240_000)
    const customer = await newCustomer('e2e-ind')
    await signIn(page, customer.email)
    const { fields } = await formFor('residential-apartment-sale-contract')

    await open(page, '/service/residential-apartment-sale-contract')
    await page.getByRole('checkbox', { name: /تسليم VIP خلال 6 ساعات/ }).click()
    await page.getByRole('link', { name: 'ابدأ الطلب' }).click()
    await expect(page.getByRole('heading', { name: /طلب خدمة/ })).toBeVisible()

    // numbered steps; submitting empty shows the mandatory fields
    await expect(page.getByRole('heading', { level: 2, name: /بيانات الأطراف/ })).toBeVisible()
    await page.getByRole('button', { name: 'متابعة إلى المراجعة' }).click()
    await expect(page.getByText(/يرجى مراجعة/)).toBeVisible()
    await shot(page, 'request-form-individual-errors')

    await fillRequired(page, fields)
    await page.getByRole('button', { name: 'متابعة إلى المراجعة' }).click()
    await expect(page.getByRole('heading', { name: 'مراجعة بيانات الطلب' })).toBeVisible()
    await expect(page.getByText('تسليم VIP خلال 6 ساعات').first()).toBeVisible()
    await page.getByRole('button', { name: /متابعة إلى الدفع · ٣٬٧٥٠ ج\.م/ }).click()
    await expect(page).toHaveURL(/\/checkout\/DQ-\d+$/)
    const orderNumber = page.url().split('/').pop()!
    await expect(page.getByText('٣٬٧٥٠ ج.م').first()).toBeVisible()

    // pay by proof → pending verification
    await page.getByRole('radio', { name: /إنستاباي/ }).click()
    await page.getByRole('button', { name: 'استخدام صورة إثبات تجريبية' }).click()
    await page.getByRole('button', { name: 'إرسال إثبات الدفع للمراجعة' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'جاري مراجعة الدفع' })).toBeVisible()

    // the order stores the VIP selection and the price snapshot
    const [row] = await sql<{ has_vip_delivery: boolean, total_minor: string }>('select has_vip_delivery, total_minor from public.orders where order_number = $1', [orderNumber])
    expect(row).toMatchObject({ has_vip_delivery: true, total_minor: '375000' })

    // customer sees the VIP marker and the price breakdown
    await open(page, `/account/orders/${orderNumber}`)
    await expect(page.getByText('VIP · تسليم خلال 6 ساعات').first()).toBeVisible()

    // admin: VIP is identifiable in the list and on the request
    const admin = await adminPage(browser)
    await open(admin, '/dashboard/requests')
    await expect(admin.getByRole('row').filter({ hasText: orderNumber }).getByText('VIP · تسليم خلال 6 ساعات')).toBeVisible()
    await open(admin, `/dashboard/requests/${orderNumber}`)
    await expect(admin.getByText('اختار العميل خدمة التسليم السريع (VIP)')).toBeVisible()
    // price snapshot card lists the selected add-on and the total
    const pricing = admin.locator('section', { hasText: 'السعر وقت الطلب' })
    await expect(pricing.getByText('تسليم VIP خلال 6 ساعات').first()).toBeVisible()
    await expect(pricing.getByText('٣٬٧٥٠ ج.م')).toBeVisible()
    await shot(admin, 'admin-request-vip')
    await admin.context().close()
  })
})

test.describe('order a company contract with bilingual drafting', () => {
  test('repeater and documents work through the UI and the total includes the bilingual fee', async ({ page }) => {
    test.setTimeout(240_000)
    const customer = await newCustomer('e2e-co')
    await signIn(page, customer.email)
    const { fields } = await formFor('shareholders-agreement')

    await open(page, '/service/shareholders-agreement')
    await page.getByRole('checkbox', { name: /صياغة العقد باللغتين العربية والإنجليزية/ }).click()
    await page.getByRole('link', { name: 'ابدأ الطلب' }).click()
    await expect(page.getByRole('group', { name: /بيانات المؤسسين والمستثمرين/ })).toBeVisible()
    // the list grows with "add row"
    const group = page.getByRole('group', { name: /^بيانات المؤسسين والمستثمرين/ })
    await expect(group.getByText('الصف ١')).toBeVisible()
    await group.getByRole('button', { name: 'إضافة صف' }).click()
    await expect(group.getByText('الصف ٣')).toBeVisible()
    await shot(page, 'request-form-company-repeater')

    await fillRequired(page, fields)
    await page.getByRole('button', { name: 'متابعة إلى المراجعة' }).click()
    await expect(page.getByRole('heading', { name: 'مراجعة بيانات الطلب' })).toBeVisible()
    // regular total = 5,000 + (7,750 − 5,000) = 7,750
    await page.getByRole('button', { name: /متابعة إلى الدفع · ٧٬٧٥٠ ج\.م/ }).click()
    await expect(page).toHaveURL(/\/checkout\/DQ-\d+$/)
    const orderNumber = page.url().split('/').pop()!
    const [row] = await sql<{ has_bilingual_drafting: boolean, total_minor: string }>('select has_bilingual_drafting, total_minor from public.orders where order_number = $1', [orderNumber])
    expect(row).toMatchObject({ has_bilingual_drafting: true, total_minor: '775000' })
  })
})

test.describe('launch campaign', () => {
  test('nothing is shown before activation; scheduled campaigns are invisible to customers', async ({ page }) => {
    await open(page, '/')
    await expect(banner(page)).toHaveCount(0)
    await sql(`update public.platform_settings set value = jsonb_build_object('enabled', true, 'durationDays', 15, 'timezone', 'Africa/Cairo', 'startDate', null, 'startTime', '00:00', 'startsAt', now() + interval '2 days', 'endsAt', now() + interval '17 days') where key = 'pricing.launch_campaign'`)
    await open(page, '/services/individuals')
    await expect(banner(page)).toHaveCount(0)
    await expect(page.locator('.pct')).toHaveCount(0)
    const body = await (await page.request.get('/api/campaign')).json()
    expect(body).toMatchObject({ active: false, startsAt: null, endsAt: null }) // no dates leak while scheduled
  })

  test('admin activates it from the dashboard; banner, badges, detail section and countdown appear', async ({ page, browser }) => {
    test.setTimeout(240_000)
    const admin = await adminPage(browser)
    await open(admin, '/dashboard/campaign')
    await expect(admin.getByText('متوقفة').first()).toBeVisible()
    await shot(admin, 'admin-campaign-disabled')
    await admin.getByRole('switch', { name: 'تفعيل حملة الإطلاق' }).click()
    await admin.getByLabel('تاريخ التفعيل (بتوقيت القاهرة)').fill(cairoToday())
    await expect(admin.getByText(/بعد 15 يومًا|بعد ١٥ يومًا/)).toBeVisible() // end date is computed, 15 days
    await admin.getByRole('button', { name: 'حفظ وجدولة الحملة' }).click()
    await expect(admin.getByText('تم حفظ إعدادات الحملة.')).toBeVisible()
    await expect(admin.getByText('نشطة').first()).toBeVisible()
    await shot(admin, 'admin-campaign-active')

    // --- public site
    await open(page, '/')
    const b = banner(page)
    await expect(b).toBeVisible()
    await expect(b.getByText(BANNER_TITLE)).toBeVisible()
    await expect(b.getByText(SUPPORT)).toBeVisible()
    await expect(b.getByRole('link', { name: BANNER_CTA })).toBeVisible()
    await expect(b.getByRole('timer')).toContainText(/متبقي على انتهاء العرض:\s*\d+ يوم، \d{2} (ساعة|ساعات)، \d{2} (دقيقة|دقائق)/)
    await shot(page, 'banner-home-desktop-ar')

    // CTA → contracts listing filtered to the offer
    await b.getByRole('link', { name: BANNER_CTA }).click()
    await expect(page).toHaveURL(/\/services\?offer=launch$/)
    await expect(page.locator('article.kh-card').first().getByText('خصم الإطلاق 50%')).toBeVisible()
    await expect(page.locator('article.kh-card')).toHaveCount(64) // all contracts, none of the consultations / legacy services
    await shot(page, 'directory-offer-ar')

    // card: struck-through original + launch price + discount label
    await open(page, '/services/individuals/rentals')
    const card = page.locator('article.kh-card').filter({ hasText: 'عقد إيجار شقة سكنية (قانون جديد)' })
    await expect(card.getByText('خصم الإطلاق 50%')).toBeVisible()
    await expect(card.locator('s')).toContainText('١٬٢٠٠')
    await expect(card.locator('.now')).toContainText('٦٠٠')
    await expect(card.locator('.pct')).toContainText('خصم 50%')

    // legacy / consultation cards never show the offer
    await open(page, '/services/consultations')
    await expect(page.getByText('خصم الإطلاق')).toHaveCount(0)

    // detail page: dedicated section, add-ons at launch prices, promo CTA
    await open(page, '/service/residential-apartment-sale-contract')
    const aside = page.locator('aside.aside')
    await expect(aside.getByText('عرض خاص بمناسبة إطلاق منصة عقودي')).toBeVisible()
    await expect(aside.getByText('استفد بخصم 50% لمدة 15 يوم من تاريخ تفعيل العرض.')).toBeVisible()
    await expect(aside.getByRole('timer')).toBeVisible()
    await expect(aside.locator('s').first()).toContainText('٢٬٥٠٠')
    await expect(aside.getByRole('link', { name: 'اطلب العقد بسعر الإطلاق' })).toBeVisible()
    await aside.getByRole('checkbox', { name: /تسليم VIP/ }).click()
    await expect(aside.locator('.total-value')).toContainText('١٬٨٧٥') // 1,250 + VIP 625 (supplied total with VIP at launch)
    await shot(page, 'detail-launch-desktop-ar')
    await admin.context().close()
  })

  test('checkout total equals the launch price shown (server-calculated) and the historical order keeps it after expiry', async ({ page }) => {
    test.setTimeout(240_000)
    await activateCampaignInDb()
    const customer = await newCustomer('e2e-launch')
    await signIn(page, customer.email)
    const { fields } = await formFor('residential-apartment-sale-contract')
    await open(page, '/service/residential-apartment-sale-contract')
    await page.getByRole('checkbox', { name: /تسليم VIP/ }).click()
    await page.getByRole('link', { name: 'اطلب العقد بسعر الإطلاق' }).click()
    await fillRequired(page, fields)
    await page.getByRole('button', { name: 'متابعة إلى المراجعة' }).click()
    // summary shows struck-through regular price and the launch total 1,875
    await expect(page.locator('aside').getByText('سعر الإطلاق').first()).toBeVisible()
    await page.getByRole('button', { name: /متابعة إلى الدفع · ١٬٨٧٥ ج\.م/ }).click()
    await expect(page).toHaveURL(/\/checkout\/DQ-\d+$/)
    const orderNumber = page.url().split('/').pop()!
    await expect(page.getByText('١٬٨٧٥ ج.م').first()).toBeVisible()
    const [row] = await sql<{ total_minor: string, pricing_snapshot: { mode: string } }>('select total_minor, pricing_snapshot from public.orders where order_number = $1', [orderNumber])
    expect(row).toMatchObject({ total_minor: '187500', pricing_snapshot: { mode: 'launch' } })

    // the offer ends → regular prices return; the existing order keeps its launch snapshot
    await disableCampaign()
    await open(page, `/account/orders/${orderNumber}`)
    await expect(page.getByText('١٬٨٧٥ ج.م').first()).toBeVisible()
    await open(page, '/service/residential-apartment-sale-contract')
    await expect(page.locator('aside.aside').getByText('٢٬٥٠٠ ج.م').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'ابدأ الطلب' })).toBeVisible()
  })

  test('the UI flips back to regular prices by itself when the offer expires (no reload)', async ({ page }) => {
    test.setTimeout(120_000)
    await activateCampaignInDb(8) // ends in 8 seconds
    await open(page, '/services/individuals/rentals')
    await expect(banner(page)).toBeVisible()
    const card = page.locator('article.kh-card').filter({ hasText: 'عقد إيجار شقة سكنية (قانون جديد)' })
    await expect(card.locator('s')).toBeVisible()
    await expect(banner(page)).toBeHidden({ timeout: 25_000 })
    await expect(card.locator('s')).toHaveCount(0)
    await expect(card.getByText('خصم الإطلاق')).toHaveCount(0)
    await expect(card.locator('.now')).toContainText('١٬٢٠٠')
  })

  test('the admin can disable an active campaign immediately', async ({ browser, page }) => {
    await activateCampaignInDb()
    const admin = await adminPage(browser)
    await open(admin, '/dashboard/campaign')
    await expect(admin.getByText('نشطة').first()).toBeVisible()
    await expect(admin.getByRole('switch', { name: 'تفعيل حملة الإطلاق' })).toHaveAttribute('aria-checked', 'true')
    await admin.getByRole('button', { name: 'إيقاف الحملة الآن' }).click()
    await expect(admin.getByText('تم حفظ إعدادات الحملة.')).toBeVisible()
    await expect(admin.getByText('متوقفة').first()).toBeVisible()
    await open(page, '/')
    await expect(banner(page)).toHaveCount(0)
    await admin.context().close()
  })

  test('no hydration mismatch or console errors while the offer is active (SSR and client agree)', async ({ page }) => {
    await activateCampaignInDb()
    const problems: string[] = []
    page.on('console', (m) => {
      if (['warning', 'error'].includes(m.type()) && /hydrat|mismatch|did not match/i.test(m.text())) problems.push(`${m.type()}: ${m.text().slice(0, 200)}`)
    })
    page.on('pageerror', e => problems.push(`pageerror: ${e.message.slice(0, 200)}`))
    for (const url of ['/', '/services', '/services/individuals/rentals', '/service/residential-apartment-sale-contract', '/en', '/en/services/companies']) {
      await open(page, url)
      await page.waitForTimeout(1500) // let the client ticker run at least one tick
    }
    expect(problems).toEqual([])
  })

  test('English LTR banner and detail section', async ({ page }) => {
    await activateCampaignInDb()
    await open(page, '/en')
    const b = banner(page)
    await expect(b.getByText('OQOUDI Launch Offer — 50% OFF Contracts for 15 Days Only!')).toBeVisible()
    await expect(b.getByText('Start your legal journey with our exclusive limited-time launch offer.')).toBeVisible()
    await expect(b.getByRole('link', { name: 'Explore Eligible Contracts' })).toBeVisible()
    await expect(b.getByRole('timer')).toContainText(/Offer ends in:\s*\d+ days?, \d{2} hours?, \d{2} minutes?/)
    await shot(page, 'banner-home-desktop-en')
    await open(page, '/en/services/individuals/rentals')
    await expect(page.locator('article.kh-card').first().getByText('LAUNCH OFFER · 50% OFF')).toBeVisible()
    await open(page, '/en/service/lease-agreement')
    await expect(page.getByRole('link', { name: 'Order this contract at the launch price' })).toBeVisible()
  })
})

test.describe('mobile (RTL)', () => {
  test.use({ viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true })

  test('banner, sub-category select and launch card fit the viewport without horizontal scroll', async ({ page }) => {
    await activateCampaignInDb()
    for (const url of ['/', '/services/individuals', '/services/individuals/rentals', '/service/residential-apartment-sale-contract']) {
      await open(page, url)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${url} horizontal overflow`).toBeLessThanOrEqual(1)
    }
    await open(page, '/')
    await expect(banner(page)).toBeVisible()
    await shot(page, 'banner-home-mobile-ar')
    await open(page, '/services/individuals')
    const select = page.getByRole('combobox', { name: 'التصنيفات الفرعية' })
    await expect(select).toBeVisible()
    await select.selectOption({ label: /إيجارات/ as never }).catch(async () => {
      const label = await select.locator('option', { hasText: 'إيجارات' }).first().textContent()
      await select.selectOption({ label: label! })
    })
    await expect(page).toHaveURL(/\/services\/individuals\/rentals$/)
    await shot(page, 'directory-rentals-mobile-ar')
    await open(page, '/service/residential-apartment-sale-contract')
    await shot(page, 'detail-launch-mobile-ar')
  })
})
