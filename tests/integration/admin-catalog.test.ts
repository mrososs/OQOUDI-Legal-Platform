import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anon, login, newCustomer, service, sql, uploadPdf, type Session } from './helpers'

/**
 * The Service Editor API with launch pricing, add-on kinds and the form-version lifecycle.
 * Creates throw-away services and archives them afterwards.
 */
let admin: Session
let customer: Session
let subCategoryId: string
const created: string[] = []
const RUN = Math.random().toString(36).slice(2, 7)

const L = (ar: string, en?: string) => ({ ar, en: en ?? null })
const payload = (slug: string, over: Record<string, unknown> = {}) => ({
  slug,
  kind: 'standard',
  primaryCategoryId: subCategoryId,
  categoryIds: [],
  title: L(`خدمة اختبار ${slug}`, `Test ${slug}`),
  shortDescription: L('وصف مختصر للاختبار', 'Short test description'),
  deliveryEstimate: L('يوم عمل', '1 business day'),
  pricingType: 'fixed',
  basePriceMinor: 100000,
  launchPriceMinor: 50000,
  launchEligible: true,
  translationStatus: 'pending_review',
  meetingDurationMinutes: null,
  isFeatured: false,
  sortOrder: 900,
  addons: [
    { id: null, kind: 'vip_delivery', title: L('تسليم VIP خلال 6 ساعات'), priceMinor: null, launchPriceMinor: 25000, isActive: true },
    { id: null, kind: 'bilingual_drafting', title: L('ثنائي اللغة'), priceMinor: 55000, launchPriceMinor: 27500, isActive: true },
  ],
  sections: [{ key: 'duration', isEnabled: true, content: null }, { key: 'pricing', isEnabled: true, content: null }],
  ...over,
})
const field = (id: string, label: string, extra: Record<string, unknown> = {}) => ({ id, type: 'text', label: L(label), required: true, ...extra })

beforeAll(async () => {
  admin = await login('admin@oqoudi.test')
  customer = await newCustomer('admin-catalog')
  const [row] = await sql<{ id: string }>(`select id from public.service_categories where slug = 'consultations'`)
  subCategoryId = row!.id
})
afterAll(async () => {
  if (created.length) await sql(`update public.services set status = 'archived' where id = any($1)`, [created])
})

async function save(slug: string, over: Record<string, unknown> = {}, id: string | null = null) {
  return admin.api<{ id: string, data?: { code?: string } }>('/api/admin/services/save', { method: 'POST', body: { id, data: payload(slug, over) } })
}

describe('saving launch pricing and add-ons', () => {
  it('stores the launch price, eligibility, add-on kinds and launch prices; links the primary category (a top-level category has no parent)', async () => {
    const res = await save(`zz-admin-launch-${RUN}`)
    expect(res.status, JSON.stringify(res.data)).toBe(200)
    created.push(res.data.id)
    const [svc] = await sql<{ launch_price_minor: string, launch_eligible: boolean, translation_status: string }>('select launch_price_minor, launch_eligible, translation_status from public.services where id = $1', [res.data.id])
    expect(svc).toMatchObject({ launch_price_minor: '50000', launch_eligible: true, translation_status: 'pending_review' })
    const addons = await sql<{ kind: string, price_minor: string | null, launch_price_minor: string }>('select kind, price_minor, launch_price_minor from public.service_addons where service_id = $1 order by kind', [res.data.id])
    expect(addons).toEqual([
      { kind: 'bilingual_drafting', price_minor: '55000', launch_price_minor: '27500' },
      { kind: 'vip_delivery', price_minor: null, launch_price_minor: '25000' },
    ])
    const links = await sql<{ slug: string }>('select c.slug from public.service_category_links l join public.service_categories c on c.id = l.category_id where l.service_id = $1 order by 1', [res.data.id])
    expect(links.map(l => l.slug)).toEqual(['consultations'])
    // the price history records the launch price
    const [hist] = await sql<{ launch_price_minor: string }>('select launch_price_minor from public.service_price_history where service_id = $1 order by changed_at desc limit 1', [res.data.id])
    expect(hist!.launch_price_minor).toBe('50000')
  })

  it.each([
    ['a launch price above the regular price', { launchPriceMinor: 200000 }],
    ['eligibility without a launch price', { launchPriceMinor: null }],
    ['launch eligibility on a quote-based service', { pricingType: 'quote', addons: [] }],
    ['two active add-ons of the same kind', { addons: [
      { id: null, kind: 'vip_delivery', title: L('أ'), priceMinor: 1000, launchPriceMinor: null, isActive: true },
      { id: null, kind: 'vip_delivery', title: L('ب'), priceMinor: 2000, launchPriceMinor: null, isActive: true },
    ] }],
    ['an add-on with no price at all', { addons: [{ id: null, kind: null, title: L('إضافة'), priceMinor: null, launchPriceMinor: null, isActive: true }] }],
  ])('rejects %s', async (_label, over) => {
    const res = await save(`zz-admin-bad-${Math.random().toString(36).slice(2, 8)}`, over)
    expect(res.status).toBe(422)
  })

  it('the launch offer cannot be attached to a consultation', async () => {
    const res = await save(`zz-admin-consult-${RUN}`, { kind: 'written_consultation' })
    expect(res.status).toBe(422)
  })

  it('only admins may edit the catalog', async () => {
    const res = await customer.api('/api/admin/services/save', { method: 'POST', body: { id: null, data: payload('zz-forbidden') } })
    expect(res.status).toBe(403)
    expect((await customer.api('/api/admin/campaign')).status).toBe(403)
    expect((await customer.api('/api/admin/campaign', { method: 'POST', body: { enabled: false } })).status).toBe(403)
  })
})

describe('form versions stay immutable when an admin republishes', () => {
  it('a changed form becomes version 2; the order placed on version 1 keeps referencing it', async () => {
    const res = await save(`zz-admin-forms-${RUN}`)
    const id = res.data.id
    created.push(id)
    const v1Fields = [field('party_name', 'اسم الطرف'), { id: 'parties', type: 'repeater', label: L('الأطراف'), columns: [{ id: 'name', type: 'text', label: L('الاسم'), required: true }], minItems: 1 }]
    expect((await admin.api(`/api/admin/services/${id}/form`, { method: 'POST', body: { fields: v1Fields } })).status).toBe(200)
    expect((await admin.api(`/api/admin/services/${id}/publish`, { method: 'POST' })).status).toBe(200)
    const [svc1] = await sql<{ published_form_version_id: string }>('select published_form_version_id from public.services where id = $1', [id])

    // a customer orders against version 1 through the real API (repeater + required text)
    const order = await customer.api<{ id: string, totalMinor: number }>('/api/orders', {
      method: 'POST',
      body: { serviceId: id, formVersionId: svc1!.published_form_version_id, answers: { party_name: 'أحمد', parties: [{ name: 'منى' }] }, addonIds: [] },
    })
    expect(order.status, JSON.stringify(order.data)).toBe(200)

    // admin edits the form and publishes: version 2
    const v2Fields = [...v1Fields, field('extra_field', 'حقل جديد', { required: false })]
    expect((await admin.api(`/api/admin/services/${id}/form`, { method: 'POST', body: { fields: v2Fields } })).status).toBe(200)
    expect((await admin.api(`/api/admin/services/${id}/publish`, { method: 'POST' })).status).toBe(200)

    const versions = await sql<{ version: number, status: string }>('select version, status from public.service_form_versions where service_id = $1 order by version', [id])
    expect(versions).toEqual([{ version: 1, status: 'retired' }, { version: 2, status: 'published' }])
    const [o] = await sql<{ form_version_id: string }>('select form_version_id from public.orders where id = $1', [order.data.id])
    expect(o!.form_version_id).toBe(svc1!.published_form_version_id)
    // the old version cannot be edited, and an order against it is rejected as outdated
    await expect(sql(`update public.service_form_versions set fields = '[]'::jsonb where id = $1`, [svc1!.published_form_version_id])).rejects.toThrow(/OQ409_FORM_VERSION_IMMUTABLE/)
    const stale = await customer.api<{ data?: { code?: string } }>('/api/orders', {
      method: 'POST',
      body: { serviceId: id, formVersionId: svc1!.published_form_version_id, answers: { party_name: 'أحمد', parties: [{ name: 'منى' }] }, addonIds: [] },
    })
    expect(stale.status).toBe(409)
  })

  it('rejects a malformed repeater definition from the editor', async () => {
    const res = await save(`zz-admin-badform-${RUN}`)
    created.push(res.data.id)
    const bad = await admin.api(`/api/admin/services/${res.data.id}/form`, { method: 'POST', body: { fields: [{ id: 'r', type: 'repeater', label: L('قائمة'), required: true }] } })
    expect(bad.status).toBe(422)
  })
})

describe('new tables and views are not public', () => {
  it('import logs are admin-only (RLS)', async () => {
    expect((await anon.from('catalog_import_runs').select('id')).data ?? []).toHaveLength(0)
    expect((await customer.db.from('catalog_import_items').select('id')).data ?? []).toHaveLength(0)
    expect(((await admin.db.from('catalog_import_runs').select('id')).data ?? []).length).toBeGreaterThan(0)
  })

  it('the form-stats view is not readable anonymously', async () => {
    const { error } = await anon.from('service_form_stats').select('id').limit(1)
    expect(error).not.toBeNull()
  })

  it('the campaign setting is not readable by browsers', async () => {
    expect((await anon.from('platform_settings').select('key').eq('key', 'pricing.launch_campaign')).data ?? []).toHaveLength(0)
    expect((await customer.db.from('platform_settings').select('key').eq('key', 'pricing.launch_campaign')).data ?? []).toHaveLength(0)
  })

  it('campaign RPCs are not callable by browsers', async () => {
    const { error } = await customer.db.rpc('admin_set_launch_campaign', { p_actor: customer.userId, p_enabled: true, p_start_date: '2030-01-01' })
    expect(error?.code).toBe('42501')
    expect((await anon.rpc('launch_campaign_state')).error?.code).toBe('42501')
  })

  it('uploads are unaffected (sanity)', async () => {
    const [svc] = await sql<{ id: string, published_form_version_id: string }>(`select id, published_form_version_id from public.services where source_ref = 'catalog-2026-10:IND-001'`)
    const id = await uploadPdf(customer, { purpose: 'form', formVersionId: svc!.published_form_version_id, fieldId: 'doc_party_ids' })
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(service).toBeTruthy()
  })
})
