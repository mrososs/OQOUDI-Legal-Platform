import { beforeAll, describe, expect, it } from 'vitest'
import { anon, createLegalNoticeOrder, errorCode, newCustomer, orderRow, payOrder, service, serviceBySlug, sql, type Session } from './helpers'

async function firstFreeSlot(skip = 0): Promise<string> {
  const from = new Date()
  const to = new Date(Date.now() + 30 * 86400000)
  const { data, error } = await anon.rpc('available_slots', { p_from: from.toISOString().slice(0, 10), p_to: to.toISOString().slice(0, 10) })
  if (error) throw error
  const free = (data ?? []).filter(s => s.is_available)
  return free[skip]!.slot_start
}

async function videoOrder(session: Session, slotStart: string) {
  const svc = await serviceBySlug('video-consultation')
  return session.api<{ id: string }>('/api/orders', {
    method: 'POST',
    body: {
      serviceId: svc.id,
      formVersionId: svc.published_form_version_id,
      answers: { topics: ['contracts'], description: 'أرغب في مناقشة عقد توريد قبل التوقيع.' },
      addonIds: [],
      slotStart,
    },
  })
}

describe('video consultation booking', () => {
  let a: Session
  let b: Session
  beforeAll(async () => {
    a = await newCustomer('book-a')
    b = await newCustomer('book-b')
  })

  it('the same slot cannot be booked twice, even concurrently', async () => {
    const slot = await firstFreeSlot()
    const [r1, r2] = await Promise.all([videoOrder(a, slot), videoOrder(b, slot)])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 409])
    const loser = r1.status === 409 ? r1 : r2
    expect(['OQ409_SLOT_TAKEN', 'OQ409_SLOT_UNAVAILABLE']).toContain(errorCode(loser.data))

    const { data } = await anon.rpc('available_slots', { p_from: slot.slice(0, 10), p_to: slot.slice(0, 10) })
    expect(data?.find(s => s.slot_start === slot)?.is_available).toBe(false)

    const live = await sql(`select id from consultation_bookings where starts_at = $1 and status in ('held','confirmed')`, [slot])
    expect(live).toHaveLength(1)
  })

  it('payment confirms the held slot; a Meet link must be valid', async () => {
    const slot = await firstFreeSlot(3)
    const created = await videoOrder(a, slot)
    expect(created.status).toBe(200)
    await payOrder(a, created.data.id)
    const [booking] = await sql<{ status: string }>('select status from consultation_bookings where order_id = $1', [created.data.id])
    expect(booking?.status).toBe('confirmed')

    const { login } = await import('./helpers')
    const lawyer = await login('karim@oqoudi.test')
    const bad = await lawyer.api(`/api/orders/${created.data.id}/meeting-link`, { method: 'POST', body: { url: 'https://evil.example/meet' } })
    expect(bad.status).toBe(422)
    const good = await lawyer.api(`/api/orders/${created.data.id}/meeting-link`, { method: 'POST', body: { url: 'https://meet.google.com/abc-defg-hij' } })
    expect(good.status).toBe(200)
    expect((await orderRow(created.data.id)).status).toBe('in_progress')
    const visible = await a.db.from('consultation_bookings').select('meeting_url').eq('order_id', created.data.id).single()
    expect(visible.data?.meeting_url).toBe('https://meet.google.com/abc-defg-hij')
  })

  it('stores canonical UTC and renders Cairo wall-clock slots', async () => {
    const slot = await firstFreeSlot()
    const cairo = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(slot))
    const [h, m] = cairo.split(':').map(Number) as [number, number]
    expect(h).toBeGreaterThanOrEqual(10)
    expect(h).toBeLessThan(16)
    expect([0, 30]).toContain(m)
  })
})

describe('catalog snapshots and versioning', () => {
  it('service price changes do not alter historical orders', async () => {
    const customer = await newCustomer('snap')
    const svc = await serviceBySlug('legal-notice')
    const before = await createLegalNoticeOrder(customer)
    const original = svc.base_price_minor

    const admin = (await sql<{ id: string }>(`select user_id as id from user_roles where role = 'admin' limit 1`))[0]!.id
    const { error } = await service.rpc('admin_update_prices', {
      p_actor: admin,
      p_prices: [{ serviceId: svc.id, pricingType: 'fixed', basePriceMinor: original + 50000 }],
    })
    expect(error).toBeNull()
    try {
      const after = await createLegalNoticeOrder(customer)
      expect((await orderRow(before.id)).total_minor).toBe(original)
      expect((await orderRow(after.id)).total_minor).toBe(original + 50000)
      const snapshot = (await orderRow(before.id)).service_snapshot as { basePriceMinor: number }
      expect(snapshot.basePriceMinor).toBe(original)
      const history = await sql('select id from service_price_history where service_id = $1', [svc.id])
      expect(history.length).toBeGreaterThanOrEqual(2)
    }
    finally {
      await service.rpc('admin_update_prices', { p_actor: admin, p_prices: [{ serviceId: svc.id, pricingType: 'fixed', basePriceMinor: original }] })
    }
  })

  it('published form versions are immutable', async () => {
    const svc = await serviceBySlug('legal-notice')
    await expect(sql(`update service_form_versions set fields = '[]'::jsonb where id = $1`, [svc.published_form_version_id])).rejects.toThrow(/OQ409_FORM_VERSION_IMMUTABLE/)
  })

  it('orders reject a stale form version', async () => {
    const customer = await newCustomer('stale')
    const svc = await serviceBySlug('legal-notice')
    const res = await customer.api('/api/orders', {
      method: 'POST',
      body: { serviceId: svc.id, formVersionId: '30000000-0000-4000-8000-000000000001', answers: {}, addonIds: [] },
    })
    expect(res.status).toBe(409)
    expect(errorCode(res.data)).toBe('OQ409_FORM_OUTDATED')
  })

  it('server re-validates submissions and prices (client values are ignored)', async () => {
    const customer = await newCustomer('val')
    const svc = await serviceBySlug('legal-notice')
    const invalid = await customer.api('/api/orders', {
      method: 'POST',
      body: { serviceId: svc.id, formVersionId: svc.published_form_version_id, answers: { subject: 'payment' }, addonIds: [] },
    })
    expect(invalid.status).toBe(422)
    expect(errorCode(invalid.data)).toBe('OQ422_VALIDATION')

    const foreignAddon = await sql<{ id: string }>(`select a.id from service_addons a join services s on s.id = a.service_id where s.slug = 'contract-drafting' limit 1`)
    const res = await customer.api('/api/orders', {
      method: 'POST',
      body: {
        serviceId: svc.id,
        formVersionId: svc.published_form_version_id,
        answers: { subject: 'payment', recipient: 'س', facts: 'وقائع تجريبية كافية الطول لاختبار النموذج.' },
        addonIds: [foreignAddon[0]!.id],
        total: 1,
      },
    })
    expect(res.status).toBe(422)
    expect(errorCode(res.data)).toBe('OQ422_ADDON_INVALID')
  })
})
