/**
 * Maps the client's price columns to catalog pricing and validates them.
 *
 * Rules (client brief):
 *  - Supplied commercial values are stored exactly as written. They are never recalculated,
 *    rounded or "fixed" — differences from the stated percentages are REPORTED, not corrected.
 *  - A post-promotion price that is not supplied is never invented. Where no approved rule
 *    exists the add-on simply has no regular price (it is only offered while its launch price applies).
 *
 * All arithmetic is exact (integers; percentages as numerators over 100).
 */
import { egpToMinorInt, type SourceContract } from './source'

export const VIP_ADDON_TITLE = { ar: 'تسليم VIP خلال 6 ساعات', en: 'VIP Delivery Within 6 Hours' } as const
export const BILINGUAL_ADDON_TITLE = { ar: 'صياغة العقد باللغتين العربية والإنجليزية', en: 'Arabic & English Contract Drafting' } as const

export interface AddonPricing {
  kind: 'vip_delivery' | 'bilingual_drafting'
  title: { ar: string, en: string }
  /** Price during the launch campaign, minor units (supplied value, verbatim). */
  launchMinor: number
  /** Regular price, minor units; null when the client supplied no post-promotion price. */
  regularMinor: number | null
  /** How `regularMinor` was obtained. */
  regularBasis: 'supplied_total_minus_original' | 'not_supplied'
}

export interface ContractPricing {
  baseMinor: number
  launchMinor: number
  addons: AddonPricing[]
}

export function pricingFor(c: SourceContract): ContractPricing {
  const p = c.prices
  const addons: AddonPricing[] = [{
    kind: 'vip_delivery',
    title: VIP_ADDON_TITLE,
    launchMinor: egpToMinorInt(p.vipLaunch),
    // Individuals: the workbook supplies the total including VIP after the promotion (col N);
    // the fee is that supplied total minus the supplied original price.
    // Companies: no post-promotion VIP price exists in the workbook → not invented.
    regularMinor: p.totalVipRegular !== null ? egpToMinorInt(p.totalVipRegular - p.original) : null,
    regularBasis: p.totalVipRegular !== null ? 'supplied_total_minus_original' : 'not_supplied',
  }]
  if (p.bilingualAvailable) {
    addons.push({
      kind: 'bilingual_drafting',
      title: BILINGUAL_ADDON_TITLE,
      launchMinor: egpToMinorInt(p.bilingualLaunch!),
      regularMinor: egpToMinorInt(p.totalBilingualRegular! - p.original),
      regularBasis: 'supplied_total_minus_original',
    })
  }
  return { baseMinor: egpToMinorInt(p.original), launchMinor: egpToMinorInt(p.launch), addons }
}

// ---------------------------------------------------------------------------
// Validation report
// ---------------------------------------------------------------------------

export type FindingKind = 'ok' | 'rounding' | 'missing_rule' | 'error'

export interface PricingFinding {
  kind: FindingKind
  code: string
  detail: string
}

/** value × pct / 100 as {whole, halfPound}; exact. */
function percentOf(value: number, pct: number): { exactTimes100: number, whole: number, isHalf: boolean } {
  const t = value * pct
  return { exactTimes100: t, whole: Math.floor(t / 100), isHalf: t % 100 === 50 }
}

const egp = (n: number) => `${n} EGP`
const exactStr = (t100: number) => `${Math.floor(t100 / 100)}${t100 % 100 ? `.${String(t100 % 100).padStart(2, '0').replace(/0$/, '')}` : ''} EGP`

export function validatePricing(c: SourceContract): PricingFinding[] {
  const p = c.prices
  const out: PricingFinding[] = []
  const ok = (code: string, detail: string) => out.push({ kind: 'ok', code, detail })
  const err = (code: string, detail: string) => out.push({ kind: 'error', code, detail })

  // 1) launch price = 50% of the original
  if (p.launch * 2 === p.original) ok('LAUNCH_50', `launch ${egp(p.launch)} = 50% of original ${egp(p.original)}`)
  else err('LAUNCH_50', `launch ${egp(p.launch)} ≠ 50% of original ${egp(p.original)} (= ${exactStr(p.original * 50)})`)

  // 2) VIP at launch = 50% of the launch price (header: "+50% وقت الإطلاق")
  const vip = percentOf(p.launch, 50)
  if (vip.isHalf) {
    out.push({
      kind: 'rounding',
      code: 'VIP_LAUNCH_ROUNDING',
      detail: `50% of launch ${egp(p.launch)} = ${exactStr(vip.exactTimes100)}; supplied ${egp(p.vipLaunch)} (${p.vipLaunch === vip.whole ? 'truncated' : p.vipLaunch === vip.whole + 1 ? 'rounded up' : 'other'}). Supplied value kept.`,
    })
  }
  else if (vip.whole === p.vipLaunch) ok('VIP_LAUNCH_PCT', `VIP at launch ${egp(p.vipLaunch)} = 50% of launch price`)
  else err('VIP_LAUNCH_PCT', `VIP at launch ${egp(p.vipLaunch)} ≠ 50% of launch price (= ${exactStr(vip.exactTimes100)})`)

  // 3) total including VIP at launch = launch + VIP (as supplied)
  if (p.totalVipLaunch === p.launch + p.vipLaunch) ok('TOTAL_VIP_LAUNCH', `${egp(p.launch)} + ${egp(p.vipLaunch)} = ${egp(p.totalVipLaunch)} (supplied total matches the supplied parts)`)
  else err('TOTAL_VIP_LAUNCH', `supplied total ${egp(p.totalVipLaunch)} ≠ launch + VIP = ${egp(p.launch + p.vipLaunch)}`)

  // 4) post-promotion
  if (p.totalVipRegular !== null) {
    if (p.totalVipRegular * 2 === p.original * 3) ok('TOTAL_VIP_REGULAR', `post-promotion total with VIP ${egp(p.totalVipRegular)} = original × 1.5 (VIP fee ${egp(p.totalVipRegular - p.original)} = 50% of original)`)
    else err('TOTAL_VIP_REGULAR', `post-promotion total with VIP ${egp(p.totalVipRegular)} ≠ original × 1.5`)
  }
  else {
    out.push({
      kind: 'missing_rule',
      code: 'VIP_REGULAR_NOT_SUPPLIED',
      detail: 'The companies workbook supplies no post-promotion VIP price or total. No fee is invented: VIP is offered only while the launch price applies until the client approves a rule.',
    })
  }

  // 5) bilingual (companies)
  if (p.bilingualAvailable) {
    const bi = percentOf(p.launch, 55)
    if (bi.isHalf) {
      out.push({
        kind: 'rounding',
        code: 'BILINGUAL_LAUNCH_ROUNDING',
        detail: `55% of launch ${egp(p.launch)} = ${exactStr(bi.exactTimes100)}; supplied ${egp(p.bilingualLaunch!)} (${p.bilingualLaunch === bi.whole ? 'truncated' : p.bilingualLaunch === bi.whole + 1 ? 'rounded up' : 'other'}). Supplied value kept.`,
      })
    }
    else if (bi.whole === p.bilingualLaunch) ok('BILINGUAL_LAUNCH_PCT', `bilingual at launch ${egp(p.bilingualLaunch!)} = 55% of launch price`)
    else err('BILINGUAL_LAUNCH_PCT', `bilingual at launch ${egp(p.bilingualLaunch!)} ≠ 55% of launch price (= ${exactStr(bi.exactTimes100)})`)

    if (p.totalBilingualLaunch === p.launch + p.bilingualLaunch!) ok('TOTAL_BILINGUAL_LAUNCH', `${egp(p.launch)} + ${egp(p.bilingualLaunch!)} = ${egp(p.totalBilingualLaunch!)}`)
    else err('TOTAL_BILINGUAL_LAUNCH', `supplied ${egp(p.totalBilingualLaunch!)} ≠ launch + bilingual = ${egp(p.launch + p.bilingualLaunch!)}`)

    if (p.totalVipBilingualLaunch === p.launch + p.vipLaunch + p.bilingualLaunch!) ok('TOTAL_VIP_BILINGUAL_LAUNCH', `${egp(p.launch)} + ${egp(p.vipLaunch)} + ${egp(p.bilingualLaunch!)} = ${egp(p.totalVipBilingualLaunch!)}`)
    else err('TOTAL_VIP_BILINGUAL_LAUNCH', `supplied ${egp(p.totalVipBilingualLaunch!)} ≠ launch + VIP + bilingual = ${egp(p.launch + p.vipLaunch + p.bilingualLaunch!)}`)

    if (p.totalBilingualRegular! * 100 === p.original * 155) ok('TOTAL_BILINGUAL_REGULAR', `post-promotion total with bilingual ${egp(p.totalBilingualRegular!)} = original × 1.55 (fee ${egp(p.totalBilingualRegular! - p.original)} = 55% of original)`)
    else err('TOTAL_BILINGUAL_REGULAR', `post-promotion total with bilingual ${egp(p.totalBilingualRegular!)} ≠ original × 1.55`)

    out.push({
      kind: 'missing_rule',
      code: 'COMBINED_REGULAR_NOT_SUPPLIED',
      detail: 'No post-promotion total for VIP + bilingual together is supplied (VIP has no post-promotion price for companies).',
    })
  }
  return out
}

/** What the server charges for a selection, by construction of the catalog (used to prove source totals). */
export function expectedTotalMinor(c: SourceContract, opts: { launch: boolean, vip: boolean, bilingual: boolean }): number | null {
  const pr = pricingFor(c)
  let total = opts.launch ? pr.launchMinor : pr.baseMinor
  for (const a of pr.addons) {
    const selected = (a.kind === 'vip_delivery' && opts.vip) || (a.kind === 'bilingual_drafting' && opts.bilingual)
    if (!selected) continue
    const fee = opts.launch ? a.launchMinor : a.regularMinor
    if (fee === null) return null
    total += fee
  }
  return total
}
