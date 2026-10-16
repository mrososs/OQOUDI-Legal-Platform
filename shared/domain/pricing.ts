/**
 * Launch-campaign and price resolution rules shared by the public site, the admin UI and tests.
 *
 * AUTHORITY: the database decides what is charged (`private.price_order` at order creation).
 * These pure functions exist so the UI can *display* exactly what the server will charge, and a
 * parity test (tests/integration/launch-campaign.test.ts) keeps them equal to the SQL.
 * Never use a total computed here as the payable amount — the order's stored total is the truth.
 */

export const CAMPAIGN_DAYS = 15
export const CAMPAIGN_TIMEZONE = 'Africa/Cairo'

export type CampaignStatus = 'disabled' | 'scheduled' | 'active' | 'expired'

export interface CampaignState {
  status: CampaignStatus
  enabled: boolean
  durationDays: number
  timezone: string
  /** Cairo-local activation date (YYYY-MM-DD) and time (HH:MM) as entered by the admin. */
  startDate: string | null
  startTime: string
  /** UTC instants (ISO). */
  startsAt: string | null
  endsAt: string | null
  /** Database clock at the moment the state was read (ISO). */
  serverNow: string
}

/** What the public site is allowed to know: nothing is exposed unless the campaign is active. */
export interface PublicCampaign {
  active: boolean
  startsAt: string | null
  endsAt: string | null
  serverNow: string
}

export function campaignStatusAt(c: Pick<CampaignState, 'enabled' | 'startsAt' | 'endsAt'>, nowMs: number): CampaignStatus {
  if (!c.enabled || !c.startsAt || !c.endsAt) return 'disabled'
  if (nowMs < Date.parse(c.startsAt)) return 'scheduled'
  if (nowMs < Date.parse(c.endsAt)) return 'active'
  return 'expired'
}

export interface Remaining {
  totalMs: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function remainingParts(endsAtMs: number, nowMs: number): Remaining {
  const totalMs = Math.max(0, endsAtMs - nowMs)
  const s = Math.floor(totalMs / 1000)
  return {
    totalMs,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  }
}

// ---------------------------------------------------------------------------
// Cairo calendar arithmetic (mirrors admin_set_launch_campaign in SQL)
// ---------------------------------------------------------------------------

function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (t: string) => Number(p.find(x => x.type === t)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(utcMs / 1000) * 1000
}

/** A wall-clock time in `timeZone` → the UTC instant (ms). */
export function zonedLocalToUtcMs(y: number, m: number, d: number, hh: number, mm: number, timeZone: string): number {
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  let utc = guess - zoneOffsetMs(guess, timeZone)
  const second = guess - zoneOffsetMs(utc, timeZone)
  if (second !== utc) utc = second
  return utc
}

/** Start/end of a campaign: end = the start's Cairo wall-clock time + `days` CALENDAR days. */
export function computeCampaignWindow(startDate: string, startTime = '00:00', days = CAMPAIGN_DAYS): { startsAt: string, endsAt: string } | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate)
  const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(startTime)
  if (!d || !t) return null
  const [y, m, day] = [Number(d[1]), Number(d[2]), Number(d[3])]
  const [hh, mm] = [Number(t[1]), Number(t[2])]
  const end = new Date(Date.UTC(y, m - 1, day + days))
  return {
    startsAt: new Date(zonedLocalToUtcMs(y, m, day, hh, mm, CAMPAIGN_TIMEZONE)).toISOString(),
    endsAt: new Date(zonedLocalToUtcMs(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate(), hh, mm, CAMPAIGN_TIMEZONE)).toISOString(),
  }
}

/** Today's date in Cairo as YYYY-MM-DD. */
export function cairoToday(nowMs = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CAMPAIGN_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(nowMs))
}

// ---------------------------------------------------------------------------
// Price resolution
// ---------------------------------------------------------------------------

export interface PricedService {
  pricingType: 'fixed' | 'quote'
  basePriceMinor: number
  launchPriceMinor: number | null
  launchEligible: boolean
}

export interface PricedAddon {
  id: string
  kind: 'vip_delivery' | 'bilingual_drafting' | null
  /** Regular price; null = none approved (add-on offered only while its launch price applies). */
  priceMinor: number | null
  launchPriceMinor: number | null
}

export interface ResolvedPrice {
  regularMinor: number
  currentMinor: number
  isLaunch: boolean
  /** Whole percent off, only while the launch price applies. */
  discountPercent: number | null
}

export function resolveServicePrice(s: PricedService, launchActive: boolean): ResolvedPrice {
  const applies = launchActive && s.launchEligible && s.launchPriceMinor !== null && s.pricingType === 'fixed'
  const current = applies ? s.launchPriceMinor! : s.basePriceMinor
  return {
    regularMinor: s.basePriceMinor,
    currentMinor: current,
    isLaunch: applies,
    discountPercent: applies && s.basePriceMinor > 0 ? Math.round((100 * (s.basePriceMinor - current)) / s.basePriceMinor) : null,
  }
}

export interface ResolvedAddonPrice {
  regularMinor: number | null
  currentMinor: number | null
  isLaunch: boolean
  /** A price is in force now; otherwise the add-on must not be offered or accepted. */
  available: boolean
}

export function resolveAddonPrice(a: PricedAddon, s: PricedService, launchActive: boolean): ResolvedAddonPrice {
  const useLaunch = launchActive && s.launchEligible && a.launchPriceMinor !== null
  const current = useLaunch ? a.launchPriceMinor : a.priceMinor
  return { regularMinor: a.priceMinor, currentMinor: current, isLaunch: useLaunch, available: current !== null }
}

export interface Quote {
  baseMinor: number
  addonsMinor: number
  totalMinor: number
  isLaunch: boolean
  /** Selected ids with no price in force (the server would reject them). */
  unavailable: string[]
}

export function quoteSelection(s: PricedService, addons: PricedAddon[], selectedIds: readonly string[], launchActive: boolean): Quote {
  const base = resolveServicePrice(s, launchActive)
  let addonsMinor = 0
  const unavailable: string[] = []
  for (const id of new Set(selectedIds)) {
    const a = addons.find(x => x.id === id)
    const price = a ? resolveAddonPrice(a, s, launchActive) : null
    if (!a || !price?.available) unavailable.push(id)
    else addonsMinor += price.currentMinor!
  }
  return { baseMinor: base.currentMinor, addonsMinor, totalMinor: base.currentMinor + addonsMinor, isLaunch: base.isLaunch, unavailable }
}
