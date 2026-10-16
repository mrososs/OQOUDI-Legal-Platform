import { describe, expect, it } from 'vitest'
import {
  campaignStatusAt,
  computeCampaignWindow,
  quoteSelection,
  remainingParts,
  resolveAddonPrice,
  resolveServicePrice,
  zonedLocalToUtcMs,
  type PricedAddon,
  type PricedService,
} from '#shared/domain/pricing'

const T = (iso: string) => Date.parse(iso)

describe('campaign status', () => {
  const c = { enabled: true, startsAt: '2026-11-01T22:00:00.000Z', endsAt: '2026-11-16T22:00:00.000Z' }

  it('is disabled when switched off or when no window is configured', () => {
    expect(campaignStatusAt({ ...c, enabled: false }, T('2026-11-05T00:00:00Z'))).toBe('disabled')
    expect(campaignStatusAt({ enabled: true, startsAt: null, endsAt: null }, T('2026-11-05T00:00:00Z'))).toBe('disabled')
  })

  it('is scheduled before the start, active from the start instant, expired from the end instant', () => {
    expect(campaignStatusAt(c, T('2026-11-01T21:59:59.999Z'))).toBe('scheduled')
    expect(campaignStatusAt(c, T('2026-11-01T22:00:00.000Z'))).toBe('active')
    expect(campaignStatusAt(c, T('2026-11-16T21:59:59.999Z'))).toBe('active')
    expect(campaignStatusAt(c, T('2026-11-16T22:00:00.000Z'))).toBe('expired')
  })
})

describe('remaining time', () => {
  it('splits into days / hours / minutes without drifting', () => {
    const end = T('2026-11-16T22:00:00Z')
    const now = end - ((12 * 24 + 8) * 3600 + 35 * 60 + 20) * 1000
    expect(remainingParts(end, now)).toMatchObject({ days: 12, hours: 8, minutes: 35, seconds: 20 })
  })

  it('never goes negative after the end', () => {
    expect(remainingParts(1000, 5000)).toEqual({ totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0 })
  })
})

describe('Cairo calendar window (exactly 15 days)', () => {
  it('starts at Cairo midnight and ends 15 calendar days later', () => {
    // Cairo is UTC+2 in November
    expect(computeCampaignWindow('2026-11-01')).toEqual({
      startsAt: '2026-10-31T22:00:00.000Z',
      endsAt: '2026-11-15T22:00:00.000Z',
    })
  })

  it('honours a start time', () => {
    expect(computeCampaignWindow('2026-11-01', '09:30')).toEqual({
      startsAt: '2026-11-01T07:30:00.000Z',
      endsAt: '2026-11-16T07:30:00.000Z',
    })
  })

  it('keeps calendar-day semantics across a daylight-saving change (Egypt: UTC+2 → UTC+3 at the end of April)', () => {
    const w = computeCampaignWindow('2027-04-25')!
    expect(w.startsAt).toBe('2027-04-24T22:00:00.000Z') // +02:00
    expect(w.endsAt).toBe('2027-05-09T21:00:00.000Z') // +03:00 → the window is 359 h, but 15 Cairo calendar days
    expect((Date.parse(w.endsAt) - Date.parse(w.startsAt)) / 3600000).toBe(359)
  })

  it('rejects malformed input', () => {
    expect(computeCampaignWindow('01/11/2026')).toBeNull()
    expect(computeCampaignWindow('2026-11-01', '25:00')).toBeNull()
  })

  it('converts local wall time to the right instant', () => {
    expect(new Date(zonedLocalToUtcMs(2026, 7, 1, 12, 0, 'Africa/Cairo')).toISOString()).toBe('2026-07-01T09:00:00.000Z') // summer: +03:00
  })
})

const service: PricedService = { pricingType: 'fixed', basePriceMinor: 250000, launchPriceMinor: 125000, launchEligible: true }
const vipIndividual: PricedAddon = { id: 'vip', kind: 'vip_delivery', priceMinor: 125000, launchPriceMinor: 62500 }
const vipCompany: PricedAddon = { id: 'vip', kind: 'vip_delivery', priceMinor: null, launchPriceMinor: 62500 }
const bilingual: PricedAddon = { id: 'bi', kind: 'bilingual_drafting', priceMinor: 137500, launchPriceMinor: 96200 }

describe('price resolution', () => {
  it('uses the launch price only while the campaign is active and the service is eligible', () => {
    expect(resolveServicePrice(service, true)).toEqual({ regularMinor: 250000, currentMinor: 125000, isLaunch: true, discountPercent: 50 })
    expect(resolveServicePrice(service, false)).toEqual({ regularMinor: 250000, currentMinor: 250000, isLaunch: false, discountPercent: null })
    expect(resolveServicePrice({ ...service, launchEligible: false }, true).currentMinor).toBe(250000)
    expect(resolveServicePrice({ ...service, pricingType: 'quote' }, true).isLaunch).toBe(false)
  })

  it('a company VIP add-on has no price outside the campaign (not invented)', () => {
    expect(resolveAddonPrice(vipCompany, service, true)).toMatchObject({ available: true, currentMinor: 62500, isLaunch: true })
    expect(resolveAddonPrice(vipCompany, service, false)).toMatchObject({ available: false, currentMinor: null })
  })

  it('totals add the selected add-ons at the price in force', () => {
    expect(quoteSelection(service, [vipIndividual, bilingual], ['vip', 'bi'], true).totalMinor).toBe(125000 + 62500 + 96200)
    expect(quoteSelection(service, [vipIndividual, bilingual], ['vip', 'bi'], false).totalMinor).toBe(250000 + 125000 + 137500)
  })

  it('flags selections that have no price in force and ignores duplicates', () => {
    const q = quoteSelection(service, [vipCompany], ['vip', 'vip', 'ghost'], false)
    expect(q.unavailable).toEqual(['vip', 'ghost'])
    expect(quoteSelection(service, [vipIndividual], ['vip', 'vip'], true).addonsMinor).toBe(62500)
  })
})
