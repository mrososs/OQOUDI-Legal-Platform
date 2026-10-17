import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { identity, startMockIdp, type MockIdp } from './mock-idp'
import { MAILPIT, PASSWORD, uniqueEmail } from './support'
import { createLegalNoticeOrder, login, service, sql } from '../integration/helpers'

/**
 * Google sign-in, end to end, through REAL GoTrue and the REAL app — with a
 * mock identity provider standing in for Google (see mock-idp.ts). The app
 * always asks for `provider=google`; the test only rewrites that one query
 * parameter on GoTrue's /authorize request so the round trip lands on the
 * local mock instead of accounts.google.com. Real Google (consent screen,
 * account chooser, Google's own claims) is NOT exercised here.
 */
let idp: MockIdp

test.beforeAll(async () => {
  idp = await startMockIdp()
})
test.afterAll(async () => {
  await idp.close()
})

const SHOTS = fileURLToPath(new URL('../../docs/auth/screenshots/', import.meta.url))

/**
 * Navigate, then wait until Nuxt has hydrated: input typed or a form submitted
 * before hydration is lost to a native form submit. Network idleness is only
 * best-effort — the Vite dev server can keep a connection open after a
 * redirect chain, and that must not fail a test that is about the app.
 */
async function go(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as unknown as { __vue_app__?: unknown } | null)?.__vue_app__)
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
}

/** Documentation screenshot of the page content (no sticky header duplication, no dev-only badge). */
async function shot(page: Page, name: string) {
  await page.addStyleTag({ content: '[id^="nuxt-devtools"] { display: none !important; }' })
  await page.locator('#main').screenshot({ path: `${SHOTS}${name}.png` })
}

async function routeGoogleToMock(page: Page) {
  await page.route('**/auth/v1/authorize**', (route) => {
    const url = new URL(route.request().url())
    url.searchParams.set('provider', 'keycloak')
    return route.continue({ url: url.toString() })
  })
}

/** Click "Continue with Google" on `path` and let the whole redirect round trip finish. */
async function continueWithGoogle(page: Page, path = '/auth/login') {
  await routeGoogleToMock(page)
  await go(page, path)
  await page.getByTestId('google-signin').click()
}

async function signedOut(page: Page) {
  await page.context().clearCookies()
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() }).catch(() => {})
}

async function fillOnboarding(page: Page, v: { phone: string, kind?: 'فرد' | 'شركة', company?: string, name?: string }) {
  if (v.name !== undefined) await page.getByLabel('الاسم بالكامل').fill(v.name)
  await page.getByLabel('رقم الموبايل').fill(v.phone)
  if (v.kind) await page.getByRole('radio', { name: v.kind }).click()
  if (v.company !== undefined) await page.getByLabel('اسم الشركة').fill(v.company)
}

const submitOnboarding = (page: Page) => page.getByRole('button', { name: 'حفظ البيانات والمتابعة' }).click()

async function userByEmail(email: string) {
  const users = await sql<{ id: string }>('select id from auth.users where email = $1', [email])
  return users
}
async function snapshot(userId: string) {
  const [profile] = await sql<{ full_name: string, phone: string | null, onboarding_completed_at: Date | null, preferred_locale: string }>(
    'select full_name, phone, onboarding_completed_at, preferred_locale from public.profiles where id = $1', [userId])
  const accounts = await sql<{ id: string, kind: string, display_name: string }>(
    `select a.id, a.kind::text as kind, a.display_name from public.customer_accounts a
     join public.customer_account_members m on m.account_id = a.id where m.user_id = $1`, [userId])
  const roles = (await sql<{ role: string }>('select role::text from public.user_roles where user_id = $1 order by role', [userId])).map(r => r.role)
  const identities = (await sql<{ provider: string }>('select provider from auth.identities where user_id = $1 order by provider', [userId])).map(r => r.provider)
  return { profile: profile!, accounts, roles, identities }
}
async function mailTo(email: string) {
  const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
  return ((await res.json()) as { messages?: unknown[] }).messages ?? []
}

test.describe('Scenario A — brand-new Google user', () => {
  test('signs up with Google, completes onboarding once, and lands in the account', async ({ page }) => {
    const email = uniqueEmail('g-new')
    idp.setNext({ kind: 'approve', identity: identity(email, 'منى حسن الشاذلي') })

    // exactly one PKCE code exchange: the app must not double-exchange the one-time code
    const pkceExchanges: string[] = []
    page.on('request', (r) => { if (r.url().includes('grant_type=pkce')) pkceExchanges.push(r.url()) })
    const consoleErrors: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })

    await continueWithGoogle(page)
    await page.waitForURL(/\/account\/complete-profile/, { timeout: 60_000 })
    expect(pkceExchanges).toHaveLength(1)
    expect(consoleErrors.filter(e => /auth|pkce|code verifier|exchange/i.test(e))).toEqual([])

    // Prefilled from Google, email read-only, labels exactly as specified
    await expect(page.getByRole('heading', { name: 'استكمال بيانات الحساب' })).toBeVisible()
    await expect(page.getByLabel('الاسم بالكامل')).toHaveValue('منى حسن الشاذلي')
    await expect(page.getByLabel('البريد الإلكتروني')).toHaveValue(email)
    await expect(page.getByLabel('البريد الإلكتروني')).toHaveAttribute('readonly', '')
    await expect(page.getByLabel('رقم الموبايل')).toHaveValue('')
    await expect(page.getByRole('radio', { name: 'فرد' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('radio', { name: 'شركة' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'حفظ البيانات والمتابعة' })).toBeVisible()

    // database state right after Google: one user, incomplete, one account, no extra email sent
    const [user] = await userByEmail(email)
    let s = await snapshot(user!.id)
    expect(s.profile.onboarding_completed_at).toBeNull()
    expect(s.accounts).toHaveLength(1)
    expect(s.roles).toEqual(['customer'])
    expect(await mailTo(email)).toHaveLength(0) // no OQOUDI confirmation email after Google OAuth

    // validation: required phone, Egyptian format, company name
    await page.getByLabel('رقم الموبايل').fill('')
    await submitOnboarding(page)
    await expect(page.getByText('هذا الحقل مطلوب.').first()).toBeVisible()
    await page.getByLabel('رقم الموبايل').fill('12345')
    await submitOnboarding(page)
    await expect(page).toHaveURL(/complete-profile/)
    await expect(page.getByText(/أدخل رقم هاتف مصريًا صحيحًا/)).toBeVisible()
    await page.getByLabel('رقم الموبايل').fill('01001234567')
    await page.getByRole('radio', { name: 'شركة' }).click()
    await expect(page.getByLabel('اسم الشركة')).toBeVisible()
    await submitOnboarding(page)
    await expect(page).toHaveURL(/complete-profile/) // company name missing
    await expect(page.getByText('هذا الحقل مطلوب.')).toBeVisible()
    s = await snapshot(user!.id)
    expect(s.profile.onboarding_completed_at).toBeNull() // nothing saved by failed attempts

    await page.getByLabel('اسم الشركة').fill('شركة نيل للحلول التقنية')
    await submitOnboarding(page)
    await page.waitForURL(/\/account$/, { timeout: 30_000 })

    s = await snapshot(user!.id)
    expect(s.profile.onboarding_completed_at).not.toBeNull()
    expect(s.profile.phone).toBe('+201001234567')
    expect(s.accounts).toHaveLength(1)
    expect(s.accounts[0]).toMatchObject({ kind: 'company', display_name: 'شركة نيل للحلول التقنية' })
    expect(s.roles).toEqual(['customer'])
    expect(await mailTo(email)).toHaveLength(0)

    // survives a hard refresh (SSR cookies) and never bounces back to onboarding
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/account$/)
  })
})

test.describe('Scenario B — returning Google user', () => {
  test('signs in directly, from either page, without repeating onboarding or duplicating anything', async ({ page }) => {
    const email = uniqueEmail('g-ret')
    idp.setNext({ kind: 'approve', identity: identity(email, 'يوسف عادل') })

    await continueWithGoogle(page)
    await page.waitForURL(/complete-profile/, { timeout: 60_000 })
    await fillOnboarding(page, { phone: '+20 111 234 8890', name: 'يوسف عادل الجوهري' })
    await submitOnboarding(page)
    await page.waitForURL(/\/account$/)
    const [user] = await userByEmail(email)
    const before = await snapshot(user!.id)

    for (const entry of ['/auth/register', '/auth/login']) {
      await signedOut(page)
      await continueWithGoogle(page, entry)
      await page.waitForURL(/\/account$/, { timeout: 60_000 }) // straight in: no onboarding
      await expect(page.getByRole('heading', { name: 'استكمال بيانات الحساب' })).toHaveCount(0)
    }

    expect(await userByEmail(email)).toHaveLength(1)
    const after = await snapshot(user!.id)
    expect(after.accounts).toEqual(before.accounts)
    expect(after.profile).toEqual(before.profile) // Google's name does not overwrite what the customer entered
    expect(after.profile.full_name).toBe('يوسف عادل الجوهري')
  })
})

test.describe('Scenario C — existing email/password customer', () => {
  test('a verified Google identity links to the SAME user: id, account, orders and password are preserved', async ({ page }) => {
    const email = uniqueEmail('g-link')
    const { data, error } = await service.auth.admin.createUser({
      email, password: PASSWORD, email_confirm: true,
      user_metadata: { full_name: 'أحمد سامي', account_type: 'individual', phone: '+201001234599' },
    })
    if (error) throw error
    const userId = data.user.id
    const session = await login(email)
    await createLegalNoticeOrder(session)
    const before = await snapshot(userId)
    const ordersBefore = await sql('select id, customer_account_id, created_by from public.orders where created_by = $1', [userId])
    expect(ordersBefore).toHaveLength(1)
    expect(before.identities).toEqual(['email'])

    idp.setNext({ kind: 'approve', identity: identity(email, 'Ahmed From Google', true) })
    await continueWithGoogle(page)
    await page.waitForURL(/\/account$/, { timeout: 60_000 }) // complete customer → no onboarding

    expect(await userByEmail(email)).toEqual([{ id: userId }]) // no second user
    const after = await snapshot(userId)
    expect(after.identities).toEqual(['email', 'keycloak']) // identity linked (provider `google` in production)
    expect(after.accounts).toEqual(before.accounts)
    expect(after.roles).toEqual(before.roles)
    expect(after.profile).toEqual(before.profile) // name/phone not overwritten by the provider
    expect(await sql('select id, customer_account_id, created_by from public.orders where created_by = $1', [userId])).toEqual(ordersBefore)
    await expect(page.getByText('Ahmed From Google')).toHaveCount(0)

    await login(email) // the existing password still works: not reset by linking
  })

  test('an UNVERIFIED provider email never signs in as, or merges into, the existing user', async ({ page }) => {
    const email = uniqueEmail('g-unv')
    const { data, error } = await service.auth.admin.createUser({
      email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: 'ضحية', phone: '+201001234598' },
    })
    if (error) throw error
    const victimId = data.user.id
    const before = await snapshot(victimId)

    idp.setNext({ kind: 'approve', identity: identity(email, 'Attacker', false) })
    await continueWithGoogle(page)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Whatever GoTrue decides, the existing user must be untouched and the browser must not hold their session.
    const after = await snapshot(victimId)
    expect(after.identities).toEqual(before.identities)
    expect(after.accounts).toEqual(before.accounts)
    expect(after.profile).toEqual(before.profile)
    await go(page, '/account')
    await expect(page).toHaveURL(/\/auth\/login|\/account\/complete-profile/)
    const users = await userByEmail(email)
    expect(users.map(u => u.id)).toContain(victimId)
  })
})

test.describe('Scenario D — existing Admin', () => {
  test('a Google identity linked to the Admin keeps the role: dashboard, no onboarding, no new account', async ({ page }) => {
    const adminEmail = 'admin@oqoudi.test'
    const [admin] = await userByEmail(adminEmail)
    const before = await snapshot(admin!.id)
    expect(before.roles).toContain('admin')
    try {
      idp.setNext({ kind: 'approve', identity: identity(adminEmail, 'Admin From Google', true) })
      await continueWithGoogle(page)
      await page.waitForURL(/\/dashboard/, { timeout: 60_000 })
      await expect(page.getByRole('heading', { name: 'استكمال بيانات الحساب' })).toHaveCount(0)

      const after = await snapshot(admin!.id)
      expect(after.roles).toEqual(before.roles)
      expect(after.accounts).toEqual(before.accounts) // no new customer account for the Admin
      expect(after.profile).toEqual(before.profile)
      expect(await userByEmail(adminEmail)).toHaveLength(1)

      // and the Admin can still reach admin-only pages
      await go(page, '/dashboard/payments')
      await expect(page).toHaveURL(/\/dashboard\/payments/)
    }
    finally {
      await sql("delete from auth.identities where user_id = $1 and provider = 'keycloak'", [admin!.id]) // leave the seeded admin as found
    }
  })

  test('a different Google account never becomes an Admin, whatever its name or email says', async ({ page }) => {
    const email = uniqueEmail('g-notadmin')
    idp.setNext({ kind: 'approve', identity: identity(email, 'admin مدير المنصة', true) })
    await continueWithGoogle(page)
    await page.waitForURL(/complete-profile/, { timeout: 60_000 })
    const [user] = await userByEmail(email)
    expect((await snapshot(user!.id)).roles).toEqual(['customer'])
    await go(page, '/dashboard')
    await page.waitForLoadState('networkidle')
    expect(new URL(page.url()).pathname).not.toMatch(/^\/dashboard/) // staff area is closed to them
    expect(new URL(page.url()).pathname).toBe('/account/complete-profile')
  })
})

test.describe('callback failures', () => {
  test('cancelling at the provider shows a clear message and signs nobody in', async ({ page }) => {
    idp.setNext({ kind: 'deny' })
    await continueWithGoogle(page)
    await page.waitForURL(/\/auth\/callback/, { timeout: 60_000 })
    const failure = page.getByTestId('oauth-failure')
    await expect(failure).toHaveAttribute('data-failure', 'cancelled')
    await expect(failure).toContainText('تم إلغاء تسجيل الدخول عبر Google')
    await go(page, '/account')
    await expect(page).toHaveURL(/\/auth\/login/)
    await page.waitForLoadState('networkidle')

    // retry from the failure page works
    const email = uniqueEmail('g-retry')
    idp.setNext({ kind: 'approve', identity: identity(email, 'محاولة ثانية') })
    await continueWithGoogle(page)
    await page.waitForURL(/complete-profile/, { timeout: 60_000 })
  })

  const cases: [string, string, string][] = [
    ['no parameters at all', '/auth/callback', 'invalid'],
    ['an unknown / expired code', '/auth/callback?code=expired-or-bogus-code', 'expired'],
    ['access_denied in the query', '/auth/callback?error=access_denied&error_code=access_denied&error_description=denied', 'cancelled'],
    ['access_denied in the hash', '/auth/callback#error=access_denied&error_code=access_denied', 'cancelled'],
    ['an expired flow state', '/auth/callback?error=invalid_request&error_code=flow_state_expired&error_description=expired', 'expired'],
    ['an unverified provider email', '/auth/callback?error=server_error&error_code=provider_email_needs_verification', 'emailNotVerified'],
    ['an email that already has an account', '/auth/callback?error=server_error&error_code=email_exists', 'accountExists'],
    ['an unknown error', '/auth/callback?error=server_error&error_code=something_new', 'generic'],
  ]
  for (const [label, url, expected] of cases) {
    test(`shows the right message and no session for ${label}`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId('oauth-failure')).toHaveAttribute('data-failure', expected, { timeout: 20_000 })
      await expect(page.getByRole('link', { name: 'المحاولة مرة أخرى' })).toBeVisible()
      await go(page, '/account')
      await expect(page).toHaveURL(/\/auth\/login/) // still signed out
    })
  }
})

test.describe('onboarding gate and redirects', () => {
  async function newIncompleteGoogleUser(page: Page, tag: string) {
    const email = uniqueEmail(tag)
    idp.setNext({ kind: 'approve', identity: identity(email, 'سارة منصور') })
    await continueWithGoogle(page)
    await page.waitForURL(/complete-profile/, { timeout: 60_000 })
    return email
  }

  test('protected customer pages redirect to complete-profile and resume the original page afterwards', async ({ page }) => {
    await newIncompleteGoogleUser(page, 'g-gate')

    await go(page, '/account/orders')
    await expect(page).toHaveURL(/\/account\/complete-profile\?redirect=(%2F|\/)account(%2F|\/)orders$/)
    await go(page, '/service/legal-notice/request')
    await expect(page).toHaveURL(/\/account\/complete-profile\?redirect=(%2F|\/)service(%2F|\/)legal-notice(%2F|\/)request$/)

    // public browsing is untouched
    await go(page, '/services')
    await expect(page).toHaveURL(/\/services$/)
    await go(page, '/')
    await expect(page).toHaveURL(/\/$/)

    // signed-in but incomplete: login/register send them to onboarding (no loop)
    await go(page, '/auth/login')
    await expect(page).toHaveURL(/complete-profile/)
    await go(page, '/auth/register')
    await expect(page).toHaveURL(/complete-profile/)

    // the API refuses order creation server-side too
    const res = await page.request.post('/api/orders', { data: {}, failOnStatusCode: false })
    expect([403, 422]).toContain(res.status())

    // finish → land on the page that was originally requested
    await go(page, '/account/orders')
    await fillOnboarding(page, { phone: '01012345678' })
    await submitOnboarding(page)
    await page.waitForURL(/\/account\/orders$/, { timeout: 30_000 })
  })

  test('open-redirect and loop attempts in ?redirect= are neutralised', async ({ page }) => {
    const appOrigin = new URL(process.env.APP_URL ?? 'http://localhost:3000').origin
    for (const bad of ['//evil.example', 'https://evil.example/x', '/auth/login', '/account/complete-profile', '/\\evil.example']) {
      await signedOut(page)
      await newIncompleteGoogleUser(page, 'g-redir')
      await go(page, `/account/complete-profile?redirect=${encodeURIComponent(bad)}`)
      await page.waitForLoadState('networkidle')
      await fillOnboarding(page, { phone: '01012345678' })
      await submitOnboarding(page)
      await page.waitForURL(`${appOrigin}/account`, { timeout: 30_000 }) // never off-site, never back into auth/onboarding
    }
  })

  test('complete-profile is closed to signed-out visitors, completed customers and staff (no loops)', async ({ page }) => {
    await go(page, '/account/complete-profile')
    await expect(page).toHaveURL(/\/auth\/login/)

    await newIncompleteGoogleUser(page, 'g-closed')
    await fillOnboarding(page, { phone: '01012345678' })
    await submitOnboarding(page)
    await page.waitForURL(/\/account$/)
    await go(page, '/account/complete-profile')
    await expect(page).toHaveURL(/\/account$/)

    await signedOut(page)
    await go(page, '/auth/login')
    await page.getByLabel('البريد الإلكتروني').fill('admin@oqoudi.test')
    await page.getByLabel('كلمة المرور').fill(PASSWORD)
    await page.getByRole('button', { name: 'دخول' }).click()
    await page.waitForURL(/\/dashboard/)
    await go(page, '/account/complete-profile')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('browser Back after signing in never strands the user on the callback or login page', async ({ page }) => {
    const email = uniqueEmail('g-back')
    idp.setNext({ kind: 'approve', identity: identity(email, 'رانيا') })
    await continueWithGoogle(page)
    await page.waitForURL(/complete-profile/, { timeout: 60_000 })
    await fillOnboarding(page, { phone: '01012345678' })
    await submitOnboarding(page)
    await page.waitForURL(/\/account$/)
    for (let i = 0; i < 4; i++) {
      await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.waitForTimeout(800)
      await expect(page.getByTestId('oauth-failure')).toHaveCount(0)
    }
    await go(page, '/account')
    await expect(page).toHaveURL(/\/account$/)
  })
})

test.describe('English (LTR)', () => {
  test('callback, onboarding and the final page keep the /en locale; the profile records English', async ({ page }) => {
    const email = uniqueEmail('g-en')
    idp.setNext({ kind: 'approve', identity: identity(email, 'Mona Hassan') })
    await routeGoogleToMock(page)
    await go(page, '/en/auth/login')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
    await page.getByTestId('google-signin').click()
    await page.waitForURL(/\/en\/account\/complete-profile/, { timeout: 60_000 })

    await expect(page.getByRole('heading', { name: 'Complete your account details' })).toBeVisible()
    await expect(page.getByLabel('Full name')).toHaveValue('Mona Hassan')
    await expect(page.getByLabel('Email')).toHaveAttribute('readonly', '')
    await page.getByLabel('Mobile number').fill('01112348890')
    await page.getByRole('radio', { name: 'Company' }).click()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByText('This field is required.')).toBeVisible()
    await page.getByLabel('Company name').fill('Nile Tech Solutions')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.waitForURL(/\/en\/account$/, { timeout: 30_000 })

    const [user] = await userByEmail(email)
    const s = await snapshot(user!.id)
    expect(s.profile.preferred_locale).toBe('en')
    expect(s.accounts[0]).toMatchObject({ kind: 'company', display_name: 'Nile Tech Solutions' })
  })
})

test.describe('layout: Arabic RTL / English LTR, desktop and mobile', () => {
  const viewports = [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]
  for (const vp of viewports) {
    for (const lang of ['ar', 'en'] as const) {
      test(`login, register and onboarding — ${lang} on ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        const prefix = lang === 'en' ? '/en' : ''
        const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

        for (const [name, path] of [['login', '/auth/login'], ['register', '/auth/register']] as const) {
          await go(page, `${prefix}${path}`)
          await expect(page.locator('html')).toHaveAttribute('dir', lang === 'en' ? 'ltr' : 'rtl')
          const button = page.getByTestId('google-signin')
          await expect(button).toBeVisible()
          await expect(button).toContainText(lang === 'en' ? 'Continue with Google' : 'المتابعة باستخدام Google')
          const box = (await button.boundingBox())!
          expect(box.height).toBeGreaterThanOrEqual(44) // comfortable touch target
          expect(box.width).toBeGreaterThan(200)
          expect(await noOverflow(), `${name} horizontal overflow`).toBe(true)
          await shot(page, `${name}-${lang}-${vp.name}`)
        }

        // onboarding screen (needs an incomplete signed-in user)
        const email = uniqueEmail(`g-ui-${lang}-${vp.name}`)
        idp.setNext({ kind: 'approve', identity: identity(email, lang === 'en' ? 'Sara Mansour' : 'سارة منصور') })
        await routeGoogleToMock(page)
        await go(page, `${prefix}/auth/login`)
        await page.getByTestId('google-signin').click()
        await page.waitForURL(/complete-profile/, { timeout: 60_000 })
        await page.waitForLoadState('networkidle')
        await expect(page.locator('html')).toHaveAttribute('dir', lang === 'en' ? 'ltr' : 'rtl')
        expect(await noOverflow(), 'onboarding horizontal overflow').toBe(true)
        await shot(page, `onboarding-${lang}-${vp.name}`)
        await page.getByRole('radio', { name: lang === 'en' ? 'Company' : 'شركة' }).click()
        await page.getByRole('button', { name: lang === 'en' ? 'Save and continue' : 'حفظ البيانات والمتابعة' }).click()
        await expect(page.locator('.kh-field__hint--error').first()).toBeVisible()
        expect(await noOverflow(), 'onboarding errors horizontal overflow').toBe(true)
        await shot(page, `onboarding-errors-${lang}-${vp.name}`)
      })
    }
  }
})
