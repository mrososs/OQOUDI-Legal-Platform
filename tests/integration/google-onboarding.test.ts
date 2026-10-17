import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { adminLogin, errorCode, login, newCustomer, PASSWORD, serviceBySlug, service, sql, type Session } from './helpers'

/**
 * First-time onboarding for Google (OAuth) customers.
 *
 * A real Google login needs a Google account, so these tests create the user
 * the way GoTrue does after a Google sign-in: an `auth.users` row whose
 * `raw_app_meta_data.provider` is `google` and whose metadata carries the
 * Google profile (name, picture) but no phone. That fires the same
 * `handle_new_user` trigger. The browser-level OAuth round trip is covered in
 * tests/e2e/google-oauth.spec.ts against a mock identity provider.
 */

interface ProfileRow { full_name: string, phone: string | null, preferred_locale: string, onboarding_completed_at: string | null, email: string }
interface AccountRow { id: string, kind: string, display_name: string }

async function newGoogleUser(label = 'g'): Promise<Session> {
  const email = `${label}-${randomUUID().slice(0, 8)}@test.oqoudi.local`
  const { error } = await service.auth.admin.createUser({
    email,
    password: PASSWORD, // only so the test can obtain a session; Google users have none in production
    email_confirm: true,
    app_metadata: { provider: 'google', providers: ['google'] },
    user_metadata: {
      full_name: 'منى حسن الشاذلي',
      name: 'منى حسن الشاذلي',
      avatar_url: 'https://lh3.googleusercontent.com/a/test',
      email_verified: true,
      iss: 'https://accounts.google.com',
      sub: randomUUID(),
    },
  })
  if (error) throw error
  return login(email)
}

const profileOf = async (id: string) => (await sql<ProfileRow>('select full_name, phone, preferred_locale, onboarding_completed_at, email from public.profiles where id = $1', [id]))[0]!
const accountsOf = (id: string) => sql<AccountRow>(
  `select a.id, a.kind::text as kind, a.display_name from public.customer_accounts a
   join public.customer_account_members m on m.account_id = a.id where m.user_id = $1 order by a.created_at`, [id])
const rolesOf = async (id: string) => (await sql<{ role: string }>('select role::text from public.user_roles where user_id = $1 order by role', [id])).map(r => r.role)

const complete = (s: Session, body: Record<string, unknown>) => s.api<{ status: string, accountKind?: string, displayName?: string }>('/api/account/complete-profile', { method: 'POST', body })
const individual = { fullName: 'منى حسن الشاذلي', phone: '01112348890', accountKind: 'individual' }

async function placeOrder(s: Session) {
  const svc = await serviceBySlug('legal-notice')
  return s.api('/api/orders', {
    method: 'POST',
    body: {
      serviceId: svc.id,
      formVersionId: svc.published_form_version_id,
      answers: { subject: 'payment', recipient: 'شركة الاختبار', facts: 'وقائع تجريبية كافية الطول لاختبار النموذج والتحقق منه.', files: [] },
      addonIds: [],
    },
  })
}

describe('signup bootstrap', () => {
  it('a Google signup creates ONE profile, ONE customer role and ONE individual account — still incomplete', async () => {
    const g = await newGoogleUser('boot')
    const profile = await profileOf(g.userId)
    expect(profile.full_name).toBe('منى حسن الشاذلي') // from Google metadata
    expect(profile.phone).toBeNull()
    expect(profile.onboarding_completed_at).toBeNull()
    expect(await rolesOf(g.userId)).toEqual(['customer'])
    const accounts = await accountsOf(g.userId)
    expect(accounts).toHaveLength(1)
    expect(accounts[0]).toMatchObject({ kind: 'individual', display_name: 'منى حسن الشاذلي' })
  })

  it('an email/password signup that supplied a phone is born onboarded (no extra step)', async () => {
    const c = await newCustomer('pw')
    expect((await profileOf(c.userId)).onboarding_completed_at).not.toBeNull()
  })

  it('an email/password signup WITHOUT a phone is incomplete (never silently skipped)', async () => {
    const email = `nophone-${randomUUID().slice(0, 8)}@test.oqoudi.local`
    const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: 'بدون هاتف' } })
    if (error) throw error
    expect((await profileOf(data.user.id)).onboarding_completed_at).toBeNull()
  })

  it('seeded demo customers and staff stay complete', async () => {
    const rows = await sql<{ email: string, onboarding_completed_at: string | null }>(
      "select email, onboarding_completed_at from public.profiles where email like '%@oqoudi.test'")
    expect(rows.length).toBeGreaterThanOrEqual(6)
    expect(rows.filter(r => r.onboarding_completed_at === null)).toEqual([])
  })
})

describe('complete-profile API', () => {
  it('completes an individual: validated phone, name, completion marker — one account, same owner', async () => {
    const g = await newGoogleUser('indiv')
    const before = await accountsOf(g.userId)
    const res = await complete(g, { ...individual, locale: 'en' })
    expect(res.status).toBe(200)
    expect(res.data.status).toBe('completed')

    const profile = await profileOf(g.userId)
    expect(profile).toMatchObject({ phone: '+201112348890', full_name: 'منى حسن الشاذلي', preferred_locale: 'en' })
    expect(profile.onboarding_completed_at).not.toBeNull()
    expect(profile.email).toMatch(/^indiv-/) // email is the authenticated one, untouched

    const after = await accountsOf(g.userId)
    expect(after).toHaveLength(1)
    expect(after[0]!.id).toBe(before[0]!.id) // same account, never a second one
    expect(after[0]).toMatchObject({ kind: 'individual', display_name: 'منى حسن الشاذلي' })
    const members = await sql('select 1 from public.customer_account_members where user_id = $1', [g.userId])
    expect(members).toHaveLength(1)
    expect(await rolesOf(g.userId)).toEqual(['customer'])
  })

  it('completes a company: account kind + display name change on the EXISTING account', async () => {
    const g = await newGoogleUser('co')
    const before = await accountsOf(g.userId)
    const res = await complete(g, { fullName: 'يوسف عادل', phone: '+20 100 555 1212', accountKind: 'company', companyName: 'شركة نيل للحلول التقنية' })
    expect(res.data).toMatchObject({ status: 'completed', accountKind: 'company', displayName: 'شركة نيل للحلول التقنية' })
    const after = await accountsOf(g.userId)
    expect(after).toHaveLength(1)
    expect(after[0]).toMatchObject({ id: before[0]!.id, kind: 'company', display_name: 'شركة نيل للحلول التقنية' })
    expect((await profileOf(g.userId)).full_name).toBe('يوسف عادل')
  })

  it('rejects bad input with field errors and writes nothing', async () => {
    const g = await newGoogleUser('bad')
    const cases: [Record<string, unknown>, string][] = [
      [{ ...individual, fullName: '' }, 'fullName'],
      [{ ...individual, fullName: 'ab' }, 'fullName'],
      [{ ...individual, phone: '12345' }, 'phone'],
      [{ ...individual, phone: '+14155550123' }, 'phone'],
      [{ ...individual, accountKind: 'admin' }, 'accountKind'],
      [{ ...individual, accountKind: 'company', companyName: '' }, 'companyName'],
    ]
    for (const [body, field] of cases) {
      const res = await complete(g, body)
      expect(res.status, JSON.stringify(body)).toBe(422)
      expect(errorCode(res.data)).toBe('OQ422_VALIDATION')
      expect((res.data as { data: { fieldErrors: Record<string, unknown> } }).data.fieldErrors).toHaveProperty(field)
    }
    const profile = await profileOf(g.userId)
    expect(profile.onboarding_completed_at).toBeNull()
    expect(profile.phone).toBeNull()
    expect((await accountsOf(g.userId))[0]).toMatchObject({ kind: 'individual' })
  })

  it('recovers after a failed save: retry with corrected data completes', async () => {
    const g = await newGoogleUser('retry')
    expect((await complete(g, { ...individual, phone: 'nope' })).status).toBe(422)
    expect((await profileOf(g.userId)).onboarding_completed_at).toBeNull()
    expect((await complete(g, individual)).data.status).toBe('completed')
  })

  it('is idempotent: a repeat submission changes nothing, even with different data', async () => {
    const g = await newGoogleUser('idem')
    expect((await complete(g, individual)).data.status).toBe('completed')
    const first = await profileOf(g.userId)

    const again = await complete(g, { ...individual, fullName: 'اسم مختلف تمامًا', phone: '01099998888', accountKind: 'company', companyName: 'شركة أخرى' })
    expect(again.status).toBe(200)
    expect(again.data.status).toBe('already_completed')
    expect(await profileOf(g.userId)).toEqual(first)
    expect(await accountsOf(g.userId)).toHaveLength(1)
    expect((await accountsOf(g.userId))[0]).toMatchObject({ kind: 'individual' })
  })

  it('serialises concurrent submissions: exactly one completes, no duplicate account', async () => {
    const g = await newGoogleUser('race')
    const results = await Promise.all(Array.from({ length: 6 }, () => complete(g, individual)))
    expect(results.every(r => r.status === 200)).toBe(true)
    expect(results.filter(r => r.data.status === 'completed')).toHaveLength(1)
    expect(results.filter(r => r.data.status === 'already_completed')).toHaveLength(5)
    expect(await accountsOf(g.userId)).toHaveLength(1)
    expect(await sql('select 1 from public.audit_logs where actor_id = $1 and action = $2', [g.userId, 'profile.onboarding_completed'])).toHaveLength(1)
  })

  it('a returning (already complete) customer is never asked again and keeps their data', async () => {
    const c = await newCustomer('ret')
    const before = await profileOf(c.userId)
    const res = await complete(c, { fullName: 'تغيير غير مقصود', phone: '01000000000', accountKind: 'company', companyName: 'x y' })
    expect(res.data.status).toBe('already_completed')
    expect(await profileOf(c.userId)).toEqual(before)
  })

  it('requires an authenticated session', async () => {
    const res = await fetch(`${process.env.APP_URL ?? 'http://localhost:3000'}/api/account/complete-profile`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(individual),
    })
    expect(res.status).toBe(401)
  })
})

describe('server-side gate on orders', () => {
  it('blocks an incomplete customer from creating an order, then allows it once onboarded', async () => {
    const g = await newGoogleUser('gate')
    const blocked = await placeOrder(g)
    expect(blocked.status).toBe(403)
    expect(errorCode(blocked.data)).toBe('OQ403_ONBOARDING')
    expect(await sql('select 1 from public.orders where created_by = $1', [g.userId])).toHaveLength(0)

    await complete(g, individual)
    const ok = await placeOrder(g)
    expect(ok.status, JSON.stringify(ok.data)).toBe(200)
  })

  it('is enforced by the database itself, not only by the API route', async () => {
    const g = await newGoogleUser('gatedb')
    const svc = await serviceBySlug('legal-notice')
    const { error } = await service.rpc('order_create', {
      p_actor: g.userId, p_service: svc.id, p_form_version: svc.published_form_version_id!,
      p_answers: { subject: 'payment', recipient: 'شركة الاختبار', facts: 'وقائع تجريبية كافية الطول لاختبار النموذج والتحقق منه.', files: [] },
      p_addon_ids: [], p_document_ids: [], p_slot_start: null as unknown as string,
    })
    expect(error?.message).toBe('OQ403_ONBOARDING')
  })

  it('never blocks staff, who are exempt from customer onboarding', async () => {
    const g = await newGoogleUser('staff')
    await service.from('user_roles').insert({ user_id: g.userId, role: 'lawyer' })
    const res = await complete(g, individual)
    expect(res.data.status).toBe('not_required')
    const profile = await profileOf(g.userId)
    expect(profile.phone).toBeNull() // staff profile is not modified by customer onboarding
    expect((await placeOrder(g)).status).toBe(200)
  })
})

describe('authorization', () => {
  it('ignores identity fields from the browser: a customer cannot onboard someone else', async () => {
    const victim = await newGoogleUser('victim')
    const attacker = await newGoogleUser('attacker')
    const victimBefore = await profileOf(victim.userId)
    const victimAccounts = await accountsOf(victim.userId)

    const res = await complete(attacker, { ...individual, userId: victim.userId, user_id: victim.userId, accountId: victimAccounts[0]!.id, role: 'admin', email: 'someone@else.test', phone2: 'x' })
    expect(res.data.status).toBe('completed')

    expect(await profileOf(victim.userId)).toEqual(victimBefore)
    expect(await accountsOf(victim.userId)).toEqual(victimAccounts)
    expect((await profileOf(attacker.userId)).email).toMatch(/^attacker-/)
    expect(await rolesOf(attacker.userId)).toEqual(['customer'])
  })

  it('does not let a browser call the SECURITY DEFINER function directly', async () => {
    const victim = await newGoogleUser('rpcv')
    const attacker = await newGoogleUser('rpca')
    const { error } = await attacker.db.rpc('complete_customer_onboarding', {
      p_actor: victim.userId, p_full_name: 'Hacked Name', p_phone: '+201000000000', p_account_kind: 'individual',
    })
    expect(error?.code).toBe('42501')
    expect((await profileOf(victim.userId)).onboarding_completed_at).toBeNull()
  })

  it('does not let a customer mark themselves onboarded, change roles or write another profile', async () => {
    const g = await newGoogleUser('self')
    const victim = await newGoogleUser('self2')

    const flag = await g.db.from('profiles').update({ onboarding_completed_at: new Date().toISOString() } as never).eq('id', g.userId)
    expect(flag.error).not.toBeNull()
    expect((await profileOf(g.userId)).onboarding_completed_at).toBeNull()

    expect((await g.db.from('user_roles').insert({ user_id: g.userId, role: 'admin' })).error).not.toBeNull()
    expect(await rolesOf(g.userId)).toEqual(['customer'])

    await g.db.from('profiles').update({ full_name: 'مخترق' }).eq('id', victim.userId)
    expect((await profileOf(victim.userId)).full_name).toBe('منى حسن الشاذلي')
  })

  it('leaves an Admin untouched: role preserved, no onboarding, no new customer account', async () => {
    const admin = await adminLogin()
    const before = await profileOf(admin.userId)
    const accountsBefore = await accountsOf(admin.userId)
    const rolesBefore = await rolesOf(admin.userId)
    expect(rolesBefore).toContain('admin')

    const res = await complete(admin, { fullName: 'محاولة تغيير', phone: '01099990000', accountKind: 'company', companyName: 'شركة وهمية' })
    expect(res.data.status).toBe('not_required')
    expect(await profileOf(admin.userId)).toEqual(before)
    expect(await accountsOf(admin.userId)).toEqual(accountsBefore)
    expect(await rolesOf(admin.userId)).toEqual(rolesBefore)
  })

  it('signup metadata can never grant privileged roles, whatever the provider', async () => {
    const email = `esc-${randomUUID().slice(0, 8)}@test.oqoudi.local`
    const { data, error } = await service.auth.admin.createUser({
      email, email_confirm: true,
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: { full_name: 'Escalation', role: 'admin', roles: ['admin'], is_admin: true, account_type: 'company', onboarding_completed_at: '2020-01-01' },
    })
    if (error) throw error
    expect(await rolesOf(data.user.id)).toEqual(['customer'])
    expect((await profileOf(data.user.id)).onboarding_completed_at).toBeNull() // metadata cannot pre-complete onboarding
  })
})

describe('data integrity', () => {
  it('refuses to change the account type of an account that already has orders', async () => {
    const c = await newCustomer('lock')
    expect((await placeOrder(c)).status).toBe(200)
    const accountBefore = (await accountsOf(c.userId))[0]!
    const ordersBefore = await sql('select id, customer_account_id from public.orders where created_by = $1', [c.userId])

    await sql('update public.profiles set onboarding_completed_at = null where id = $1', [c.userId]) // force the path
    const { error } = await service.rpc('complete_customer_onboarding', {
      p_actor: c.userId, p_full_name: 'اسم جديد للعميل', p_phone: '+201001112233', p_account_kind: 'company', p_company_name: 'شركة جديدة',
    })
    expect(error?.message).toBe('OQ409_ACCOUNT_KIND_LOCKED')
    expect((await accountsOf(c.userId))[0]).toEqual(accountBefore)
    expect(await sql('select id, customer_account_id from public.orders where created_by = $1', [c.userId])).toEqual(ordersBefore)
    expect((await profileOf(c.userId)).onboarding_completed_at).toBeNull() // nothing marked complete
  })

  it('is atomic: if any write fails, nothing is changed or marked complete', async () => {
    const g = await newGoogleUser('atomic')
    const accountBefore = (await accountsOf(g.userId))[0]!
    await sql("create or replace function private.zz_fail_profile() returns trigger language plpgsql as $$ begin raise exception 'forced failure'; end $$")
    await sql("create trigger zz_fail_profile before update on public.profiles for each row when (new.full_name = 'FORCE FAILURE') execute function private.zz_fail_profile()")
    try {
      const { error } = await service.rpc('complete_customer_onboarding', {
        p_actor: g.userId, p_full_name: 'FORCE FAILURE', p_phone: '+201112348890', p_account_kind: 'company', p_company_name: 'شركة يجب ألا تُحفظ',
      })
      expect(error).not.toBeNull()
    }
    finally {
      await sql('drop trigger if exists zz_fail_profile on public.profiles')
      await sql('drop function if exists private.zz_fail_profile()')
    }
    expect((await accountsOf(g.userId))[0]).toEqual(accountBefore) // account update rolled back with the profile update
    const profile = await profileOf(g.userId)
    expect(profile.onboarding_completed_at).toBeNull()
    expect(profile.phone).toBeNull()
    // and the user can simply try again
    expect((await complete(g, individual)).data.status).toBe('completed')
  })

  it('does not create a second account for a user whose only membership is someone else\'s account', async () => {
    const owner = await newCustomer('own')
    const g = await newGoogleUser('member')
    const [own] = await accountsOf(owner.userId)
    const [mine] = await accountsOf(g.userId)
    // simulate: the user has joined another account and lost their own
    await sql('delete from public.customer_account_members where user_id = $1', [g.userId])
    await sql("insert into public.customer_account_members (account_id, user_id, member_role) values ($1, $2, 'member')", [own!.id, g.userId])
    expect((await complete(g, individual)).data.status).toBe('completed')
    expect(await sql('select 1 from public.customer_account_members where user_id = $1', [g.userId])).toHaveLength(1)
    expect((await accountsOf(g.userId))[0]!.id).toBe(own!.id)
    expect((await accountsOf(g.userId))[0]).toMatchObject({ kind: 'individual' }) // owner's account untouched
    expect(mine).toBeDefined()
  })
})

describe('migration backfill (historical users)', () => {
  const migration = readFileSync(new URL('../../supabase/migrations/20261017090000_google_onboarding.sql', import.meta.url), 'utf8')
  const backfill = migration.match(/update public\.profiles p[\s\S]*?;\n/)![0]
  const created: string[] = []

  async function historical(label: string, phone: string | null, role?: 'lawyer' | 'admin') {
    const email = `${label}-${randomUUID().slice(0, 8)}@test.oqoudi.local`
    const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: `مستخدم ${label}` } })
    if (error) throw error
    created.push(data.user.id)
    // the state before the migration existed: no marker, phone as registered
    await sql('update public.profiles set onboarding_completed_at = null, phone = $2 where id = $1', [data.user.id, phone])
    if (role) await service.from('user_roles').insert({ user_id: data.user.id, role })
    return data.user.id
  }

  afterAll(async () => {
    if (created.length) await sql('update public.profiles set onboarding_completed_at = now() where id = any($1)', [created])
  })

  it('marks users who already have a phone, and staff, as complete — and only them', async () => {
    const withPhone = await historical('hp', '+201001234500')
    const noPhone = await historical('np', null)
    const staffNoPhone = await historical('sp', null, 'lawyer')
    const adminNoPhone = await historical('ap', null, 'admin')
    await sql(backfill)
    expect((await profileOf(withPhone)).onboarding_completed_at).not.toBeNull()
    expect((await profileOf(staffNoPhone)).onboarding_completed_at).not.toBeNull()
    expect((await profileOf(adminNoPhone)).onboarding_completed_at).not.toBeNull()
    expect((await profileOf(noPhone)).onboarding_completed_at).toBeNull() // genuinely incomplete → will be asked
  })

  it('is re-runnable and never rewrites an existing completion time', async () => {
    const id = await historical('rr', '+201001234501')
    await sql(backfill)
    const first = (await profileOf(id)).onboarding_completed_at
    await sql(backfill)
    expect(first).not.toBeNull()
    expect((await profileOf(id)).onboarding_completed_at).toEqual(first)
  })
})
