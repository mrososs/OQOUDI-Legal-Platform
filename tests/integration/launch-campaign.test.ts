import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { computeCampaignWindow, quoteSelection, type PricedAddon, type PricedService } from '../../shared/domain/pricing'
import { expectedTotalMinor } from '../../shared/catalog/pricing'
import type { SourceContract } from '../../shared/catalog/source'
import { newCustomer, service, sql, type Session } from './helpers'

/**
 * The launch campaign is decided by the DATABASE clock at order creation.
 * These tests drive the setting directly and place real orders through `order_create`.
 * Every test leaves the campaign DISABLED.
 */
const DATA = new URL('../../scripts/catalog-import/data/', import.meta.url)
const contracts: SourceContract[] = JSON.parse(readFileSync(new URL('source/contracts.source.json', DATA), 'utf8'))
const spec = (ref: string) => JSON.parse(readFileSync(new URL(`specs/${ref}.json`, DATA), 'utf8')) as { slug: string }
const byRef = (ref: string) => contracts.find(c => c.ref === ref)!

const IND = byRef('IND-028') // private car sale: 1,000 → launch 500, VIP 250 / 500
const IND_HALF = byRef('IND-027') // 750 → launch 375, VIP 187 (rounding case, supplied value kept)
const CO = byRef('CO-002') // shareholders agreement: 5,000 → launch 2,500, VIP 1,250 (no regular), bilingual 1,375 / 2,750
const ADMIN_ID = '00000000-0000-4000-a000-000000000001'

type State = 'disabled' | 'scheduled' | 'active' | 'expired'
const OFFSETS: Record<Exclude<State, 'disabled'>, [string, string]> = {
  scheduled: ['2 days', '17 days'],
  active: ['-1 day', '14 days'],
  expired: ['-20 days', '-5 days'],
}

async function setCampaign(state: State) {
  if (state === 'disabled') {
    await sql(`update public.platform_settings set value = jsonb_build_object('enabled', false, 'durationDays', 15, 'timezone', 'Africa/Cairo', 'startDate', null, 'startTime', '00:00', 'startsAt', null, 'endsAt', null) where key = 'pricing.launch_campaign'`)
    return
  }
  const [from, to] = OFFSETS[state]
  await sql(`update public.platform_settings set value = jsonb_build_object('enabled', true, 'durationDays', 15, 'timezone', 'Africa/Cairo', 'startDate', null, 'startTime', '00:00', 'startsAt', now() + interval '${from}', 'endsAt', now() + interval '${to}') where key = 'pricing.launch_campaign'`)
}

const slugOf = (c: SourceContract) => spec(c.ref).slug

async function serviceRow(slug: string) {
  const [row] = await sql<{ id: string, published_form_version_id: string }>('select id, published_form_version_id from public.services where slug = $1', [slug])
  return row!
}

interface Placed { orderNumber: string, id: string, totalMinor: number }
async function place(customer: Session, slug: string, kinds: string[] = []): Promise<Placed> {
  const svc = await serviceRow(slug)
  const addons = kinds.length
    ? await sql<{ id: string }>('select id from public.service_addons where service_id = $1 and is_active and kind = any($2)', [svc.id, kinds])
    : []
  const { data, error } = await service.rpc('order_create', {
    p_actor: customer.userId,
    p_service: svc.id,
    p_form_version: svc.published_form_version_id,
    p_answers: {},
    p_addon_ids: addons.map(a => a.id),
    p_document_ids: [],
    p_slot_start: null as never,
  })
  if (error) throw Object.assign(new Error(error.message), { code: error.message })
  const d = data as { id: string, orderNumber: string, totalMinor: number }
  return { id: d.id, orderNumber: d.orderNumber, totalMinor: d.totalMinor }
}

async function orderRow(id: string) {
  const [row] = await sql<{ total_minor: string, base_price_minor: string, addons_total_minor: string, pricing_snapshot: Record<string, unknown>, has_vip_delivery: boolean, has_bilingual_drafting: boolean, service_snapshot: Record<string, unknown> }>(
    'select total_minor, base_price_minor, addons_total_minor, pricing_snapshot, has_vip_delivery, has_bilingual_drafting, service_snapshot from public.orders where id = $1', [id])
  return { ...row!, total: Number(row!.total_minor), base: Number(row!.base_price_minor), addons: Number(row!.addons_total_minor) }
}

let customer: Session
beforeAll(async () => {
  customer = await newCustomer('campaign')
})
afterEach(async () => {
  await setCampaign('disabled')
  await sql(`update public.services set launch_eligible = true where source_ref like 'catalog-2026-10:%'`)
})
afterAll(async () => {
  await setCampaign('disabled')
})

describe('the campaign never starts by itself', () => {
  it('is disabled with no date out of the box (migration seed)', async () => {
    // a freshly migrated database has this exact value; the suite restores it after every test
    const [row] = await sql<{ value: Record<string, unknown> }>(`select value from public.platform_settings where key = 'pricing.launch_campaign'`)
    expect(row!.value).toMatchObject({ enabled: false, durationDays: 15, timezone: 'Africa/Cairo', startsAt: null, endsAt: null })
  })

  it('reports status per window', async () => {
    for (const state of ['disabled', 'scheduled', 'active', 'expired'] as const) {
      await setCampaign(state)
      const [row] = await sql<{ status: string }>(`select public.launch_campaign_state() ->> 'status' as status`)
      expect(row!.status).toBe(state)
    }
  })
})

describe('order prices follow the campaign state at creation time', () => {
  it.each(['disabled', 'scheduled', 'expired'] as const)('charges the regular price while the campaign is %s', async (state) => {
    await setCampaign(state)
    const o = await place(customer, slugOf(IND))
    const row = await orderRow(o.id)
    expect(row.total).toBe(IND.prices.original * 100)
    expect(row.pricing_snapshot).toMatchObject({ mode: 'regular', campaign: null })
  })

  it('charges the launch price while active and records exactly why', async () => {
    await setCampaign('active')
    const o = await place(customer, slugOf(IND))
    const row = await orderRow(o.id)
    expect(row.total).toBe(IND.prices.launch * 100)
    expect(row.base).toBe(IND.prices.launch * 100)
    expect(row.pricing_snapshot).toMatchObject({
      mode: 'launch', regularBaseMinor: IND.prices.original * 100, launchBaseMinor: IND.prices.launch * 100, discountPercent: 50,
      campaign: { status: 'active', durationDays: 15 },
    })
    expect(row.service_snapshot).toMatchObject({ pricingMode: 'launch', basePriceMinor: IND.prices.launch * 100, regularPriceMinor: IND.prices.original * 100 })
  })

  it('returns the charged total from order_create', async () => {
    await setCampaign('active')
    const o = await place(customer, slugOf(IND))
    expect(o.totalMinor).toBe(IND.prices.launch * 100)
  })

  it('never discounts ineligible services (legal notice, consultations) even while active', async () => {
    await setCampaign('active')
    for (const slug of ['legal-notice', 'contract-drafting']) {
      const o = await place(customer, slug)
      const [svc] = await sql<{ base_price_minor: string }>('select base_price_minor from public.services where slug = $1', [slug])
      expect((await orderRow(o.id)).total, slug).toBe(Number(svc!.base_price_minor))
    }
  })

  it('respects the per-service inclusion switch', async () => {
    await setCampaign('active')
    await sql(`update public.services set launch_eligible = false where slug = $1`, [slugOf(IND)])
    const o = await place(customer, slugOf(IND))
    expect((await orderRow(o.id)).total).toBe(IND.prices.original * 100)
  })
})

describe('add-ons (VIP delivery, bilingual drafting) use the prices supplied by the client', () => {
  it('launch: totals equal the supplied launch totals (incl. the half-pound rounding cases kept as supplied)', async () => {
    await setCampaign('active')
    const vip = await orderRow((await place(customer, slugOf(IND), ['vip_delivery'])).id)
    expect(vip.total).toBe(IND.prices.totalVipLaunch * 100)
    expect(vip.has_vip_delivery).toBe(true)
    expect(vip.has_bilingual_drafting).toBe(false)
    expect(vip.service_snapshot.expeditedService).toMatchObject({ kind: 'vip_delivery' })
    // 750 EGP contract: 50% of 375 is 187.5; the client supplied 187 and 562 — stored verbatim
    expect((await orderRow((await place(customer, slugOf(IND_HALF), ['vip_delivery'])).id)).total).toBe(562 * 100)

    const co = await orderRow((await place(customer, slugOf(CO), ['bilingual_drafting'])).id)
    expect(co.total).toBe(CO.prices.totalBilingualLaunch! * 100)
    expect(co.has_bilingual_drafting).toBe(true)
    const both = await orderRow((await place(customer, slugOf(CO), ['vip_delivery', 'bilingual_drafting'])).id)
    expect(both.total).toBe(CO.prices.totalVipBilingualLaunch! * 100)
    expect(both.has_vip_delivery && both.has_bilingual_drafting).toBe(true)
  })

  it('regular: individuals VIP and companies bilingual use the supplied post-promotion totals', async () => {
    await setCampaign('expired')
    expect((await orderRow((await place(customer, slugOf(IND), ['vip_delivery'])).id)).total).toBe(IND.prices.totalVipRegular! * 100)
    expect((await orderRow((await place(customer, slugOf(CO), ['bilingual_drafting'])).id)).total).toBe(CO.prices.totalBilingualRegular! * 100)
  })

  it('companies have no approved post-promotion VIP price: it cannot be ordered outside the campaign', async () => {
    await setCampaign('disabled')
    await expect(place(customer, slugOf(CO), ['vip_delivery'])).rejects.toMatchObject({ code: 'OQ422_ADDON_INVALID' })
    // while the launch offer applies it can
    await setCampaign('active')
    expect((await place(customer, slugOf(CO), ['vip_delivery'])).totalMinor).toBe(CO.prices.totalVipLaunch * 100)
  })

  it('rejects add-ons of another service, unknown ids and bilingual drafting on individual contracts', async () => {
    const svc = await serviceRow(slugOf(IND))
    const other = await serviceRow(slugOf(CO))
    const [foreign] = await sql<{ id: string }>(`select id from public.service_addons where service_id = $1 and kind = 'vip_delivery'`, [other.id])
    const call = (ids: string[]) => service.rpc('order_create', {
      p_actor: customer.userId, p_service: svc.id, p_form_version: svc.published_form_version_id, p_answers: {}, p_addon_ids: ids, p_document_ids: [], p_slot_start: null as never,
    })
    expect((await call([foreign!.id])).error?.message).toBe('OQ422_ADDON_INVALID')
    expect((await call(['00000000-0000-4000-8000-00000000dead'])).error?.message).toBe('OQ422_ADDON_INVALID')
    const bilingualOnIndividual = await sql(`select 1 from public.service_addons where service_id = $1 and kind = 'bilingual_drafting'`, [svc.id])
    expect(bilingualOnIndividual).toHaveLength(0)
  })

  it('the add-on snapshot keeps the prices it was chosen over', async () => {
    await setCampaign('active')
    const o = await place(customer, slugOf(IND), ['vip_delivery'])
    const [line] = await sql<{ kind: string, price_minor: string, regular_price_minor: string, launch_price_minor: string, pricing_applied: string }>(
      'select kind, price_minor, regular_price_minor, launch_price_minor, pricing_applied from public.order_addons where order_id = $1', [o.id])
    expect(line).toMatchObject({ kind: 'vip_delivery', pricing_applied: 'launch' })
    expect(Number(line!.price_minor)).toBe(IND.prices.vipLaunch * 100)
    expect(Number(line!.regular_price_minor)).toBe((IND.prices.totalVipRegular! - IND.prices.original) * 100)
  })
})

describe('historical orders are immutable snapshots', () => {
  it('an order placed during the offer keeps its price after the offer ends and after catalog price edits', async () => {
    await setCampaign('active')
    const o = await place(customer, slugOf(IND), ['vip_delivery'])
    const before = await orderRow(o.id)
    await setCampaign('expired')
    await sql(`update public.services set base_price_minor = base_price_minor + 100000 where slug = $1`, [slugOf(IND)])
    const after = await orderRow(o.id)
    expect(after.total).toBe(before.total)
    expect(after.pricing_snapshot).toEqual(before.pricing_snapshot)
    // new orders use the new regular price
    expect((await orderRow((await place(customer, slugOf(IND))).id)).total).toBe(IND.prices.original * 100 + 100000)
    await sql(`update public.services set base_price_minor = base_price_minor - 100000 where slug = $1`, [slugOf(IND)])
  })

  it('orders created before the campaign feature are untouched (defaults only)', async () => {
    const rows = await sql<{ n: string }>(`select count(*) as n from public.orders where pricing_snapshot = '{}'::jsonb and not has_vip_delivery and not has_bilingual_drafting`)
    expect(Number(rows[0]!.n)).toBeGreaterThan(0)
  })
})

describe('the database price equals what the UI displays (shared rules)', () => {
  it('matches quoteSelection for every state × add-on combination', async () => {
    const [svcRow] = await sql<Record<string, unknown>>(`select id, base_price_minor::float8 as base, launch_price_minor::float8 as launch, launch_eligible from public.services where slug = $1`, [slugOf(CO)])
    const addonRows = await sql<{ id: string, kind: PricedAddon['kind'], price_minor: number | null, launch_price_minor: number | null }>(
      `select id, kind, price_minor::float8, launch_price_minor::float8 from public.service_addons where service_id = $1 and is_active`, [svcRow!.id])
    const svc: PricedService = { pricingType: 'fixed', basePriceMinor: Number(svcRow!.base), launchPriceMinor: Number(svcRow!.launch), launchEligible: true }
    const addons: PricedAddon[] = addonRows.map(a => ({ id: a.id, kind: a.kind, priceMinor: a.price_minor === null ? null : Number(a.price_minor), launchPriceMinor: a.launch_price_minor === null ? null : Number(a.launch_price_minor) }))
    const combos: string[][] = [[], ['vip_delivery'], ['bilingual_drafting'], ['vip_delivery', 'bilingual_drafting']]
    for (const state of ['disabled', 'active', 'expired'] as const) {
      await setCampaign(state)
      for (const kinds of combos) {
        const ids = addons.filter(a => a.kind && kinds.includes(a.kind)).map(a => a.id)
        const q = quoteSelection(svc, addons, ids, state === 'active')
        if (q.unavailable.length) {
          await expect(place(customer, slugOf(CO), kinds), `${state} ${kinds}`).rejects.toMatchObject({ code: 'OQ422_ADDON_INVALID' })
        }
        else {
          expect((await place(customer, slugOf(CO), kinds)).totalMinor, `${state} ${kinds}`).toBe(q.totalMinor)
          expect(q.totalMinor).toBe(expectedTotalMinor(CO, { launch: state === 'active', vip: kinds.includes('vip_delivery'), bilingual: kinds.includes('bilingual_drafting') }))
        }
      }
    }
  })
})

describe('admin campaign control', () => {
  const todayCairo = async () => (await sql<{ d: string }>(`select to_char((now() at time zone 'Africa/Cairo')::date, 'YYYY-MM-DD') as d`))[0]!.d
  const plusDays = (ymd: string, n: number) => new Date(Date.parse(`${ymd}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10)

  it('only an admin may change it', async () => {
    const { error } = await service.rpc('admin_set_launch_campaign', { p_actor: customer.userId, p_enabled: true, p_start_date: plusDays(await todayCairo(), 3) })
    expect(error?.message).toBe('OQ403')
  })

  it('rejects an enabled campaign without a date or with a date before today (Cairo)', async () => {
    const today = await todayCairo()
    expect((await service.rpc('admin_set_launch_campaign', { p_actor: ADMIN_ID, p_enabled: true, p_start_date: null as never })).error?.message).toBe('OQ422_CAMPAIGN_DATE')
    expect((await service.rpc('admin_set_launch_campaign', { p_actor: ADMIN_ID, p_enabled: true, p_start_date: plusDays(today, -1) })).error?.message).toBe('OQ422_CAMPAIGN_DATE')
  })

  it('schedules exactly 15 Cairo calendar days, matches the shared calculation and stays scheduled until the start', async () => {
    const start = plusDays(await todayCairo(), 5)
    const { data, error } = await service.rpc('admin_set_launch_campaign', { p_actor: ADMIN_ID, p_enabled: true, p_start_date: start, p_start_time: '09:30' })
    expect(error).toBeNull()
    const state = data as { status: string, startsAt: string, endsAt: string, startDate: string, startTime: string }
    const expected = computeCampaignWindow(start, '09:30')!
    expect(Date.parse(state.startsAt)).toBe(Date.parse(expected.startsAt))
    expect(Date.parse(state.endsAt)).toBe(Date.parse(expected.endsAt))
    expect(state).toMatchObject({ status: 'scheduled', startDate: start, startTime: '09:30' })
    // not active yet → regular price
    expect((await place(customer, slugOf(IND))).totalMinor).toBe(IND.prices.original * 100)
  })

  it('computes the window across a daylight-saving change like the shared helper', async () => {
    // direct SQL: the admin function refuses past dates, the arithmetic itself is what is compared here
    const [row] = await sql<{ s: string, e: string }>(`select ((timestamp '2027-04-25 00:00') at time zone 'Africa/Cairo') as s, (((timestamp '2027-04-25 00:00') + interval '15 days') at time zone 'Africa/Cairo') as e`)
    const w = computeCampaignWindow('2027-04-25')!
    expect(new Date(row!.s).toISOString()).toBe(w.startsAt)
    expect(new Date(row!.e).toISOString()).toBe(w.endsAt)
  })

  it('cannot be moved while active, but can be disabled immediately; every change is audited', async () => {
    await setCampaign('active')
    const [before] = await sql<{ n: string }>(`select count(*) as n from public.audit_logs where action = 'campaign.updated'`)
    const moved = await service.rpc('admin_set_launch_campaign', { p_actor: ADMIN_ID, p_enabled: true, p_start_date: plusDays(await todayCairo(), 2) })
    expect(moved.error?.message).toBe('OQ409_CAMPAIGN_ACTIVE')
    const off = await service.rpc('admin_set_launch_campaign', { p_actor: ADMIN_ID, p_enabled: false, p_start_date: null as never })
    expect(off.error).toBeNull()
    expect((off.data as { status: string }).status).toBe('disabled')
    expect((await place(customer, slugOf(IND))).totalMinor).toBe(IND.prices.original * 100)
    const [after] = await sql<{ n: string }>(`select count(*) as n from public.audit_logs where action = 'campaign.updated'`)
    expect(Number(after!.n)).toBe(Number(before!.n) + 1)
  })

  it('the settings row cannot be left incoherent', async () => {
    await expect(sql(`update public.platform_settings set value = '{"enabled": true}' where key = 'pricing.launch_campaign'`)).rejects.toThrow(/OQ422_CAMPAIGN_SETTING/)
  })
})
