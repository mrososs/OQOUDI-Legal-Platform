/**
 * Types and helpers for the client-supplied contract catalog (Excel workbooks).
 * Pure functions only: used by the extraction/build scripts and by unit tests.
 */

export type CatalogKind = 'individuals' | 'companies'

/** Prices exactly as written in the workbooks, in whole EGP. */
export interface SourcePrices {
  /** Column J — original (regular) price. */
  original: number
  /** Column K — launch price (50% off, 15 days). */
  launch: number
  /** Column L — VIP 6-hour delivery fee at launch. */
  vipLaunch: number
  /** Column M — launch price including VIP. */
  totalVipLaunch: number
  /** Individuals column N — total including VIP after the launch period. Companies: null (not supplied). */
  totalVipRegular: number | null
  /** Companies column N — "نعم متاح (+55%)"; individuals: false (not offered). */
  bilingualAvailable: boolean
  /** Companies column O — bilingual fee at launch. */
  bilingualLaunch: number | null
  /** Companies column P — launch price including bilingual. */
  totalBilingualLaunch: number | null
  /** Companies column Q — launch price including VIP and bilingual. */
  totalVipBilingualLaunch: number | null
  /** Companies column R — total including bilingual after the launch period. */
  totalBilingualRegular: number | null
}

export interface RowLocation {
  workbook: string
  sheet: string
  row: number
}

export interface SourceDiscrepancy {
  kind: 'missing_in_consolidated' | 'text_conflict' | 'price_conflict' | 'extra_in_consolidated'
  /** Spreadsheet column letters involved. */
  columns: string[]
  detail: string
  /** True when a commercial value conflicts and needs a human decision. */
  unresolved: boolean
  resolution: string
}

export interface SourceContract {
  /** Stable catalog reference: IND-001 … IND-032, CO-001 … CO-032. */
  ref: string
  catalog: CatalogKind
  /** Column A (م) within its workbook. */
  number: number
  subcategoryAr: string
  /** Column C. */
  nameAr: string
  /** Column D. */
  descriptionAr: string
  /** Column E — party information required. */
  partyInfo: string
  /** Column F — technical and financial information. */
  technicalFinancial: string
  /** Column G — special and additional conditions. */
  specialConditions: string
  /** Column H — documents to upload. */
  documents: string
  /** Column I — standard turnaround, verbatim. */
  turnaround: string
  prices: SourcePrices
  provenance: {
    /** The detailed workbook (source of truth for text columns). */
    detailed: RowLocation
    consolidated: RowLocation
    /** Columns restored from the detailed workbook because the consolidated one was blank. */
    restoredColumns: string[]
    discrepancies: SourceDiscrepancy[]
  }
}

/** Splits a free-text list on Arabic/Latin commas, ignoring commas inside parentheses. */
export function splitItems(text: string): string[] {
  const items: string[] = []
  let depth = 0
  let current = ''
  for (const ch of text) {
    if (ch === '(' || ch === '（') depth++
    else if (ch === ')' || ch === '）') depth = Math.max(0, depth - 1)
    if ((ch === '،' || ch === ',') && depth === 0) {
      if (current.trim()) items.push(current.trim())
      current = ''
    }
    else {
      current += ch
    }
  }
  if (current.trim()) items.push(current.trim())
  return items
}

export type SourceColumn = 'E' | 'F' | 'G' | 'H'

/** `E1`, `F3`, … → the n-th item of that column (1-based). */
export function sourceItems(c: SourceContract): Record<SourceColumn, string[]> {
  return {
    E: splitItems(c.partyInfo),
    F: splitItems(c.technicalFinancial),
    G: splitItems(c.specialConditions),
    H: splitItems(c.documents),
  }
}

export function itemRef(column: SourceColumn, index: number): string {
  return `${column}${index}`
}

export function allItemRefs(c: SourceContract): string[] {
  const items = sourceItems(c)
  return (['E', 'F', 'G', 'H'] as const).flatMap(col => items[col].map((_, i) => itemRef(col, i + 1)))
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** Normalizes Arabic-Indic digits to ASCII (comparison only; never used to rewrite source text). */
export function asciiDigits(s: string): string {
  return s.replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d)))
}

export interface Turnaround {
  minDays: number
  maxDays: number
}

/** "1 - 2 يوم عمل" → {1,2}; "1 يوم عمل" → {1,1}; "2 - 3 أيام عمل" → {2,3}. null when unparseable. */
export function parseTurnaround(text: string): Turnaround | null {
  const m = /^\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:يوم|أيام|ايام)\s*عمل\s*$/.exec(asciiDigits(text))
  if (!m) return null
  const min = Number(m[1])
  const max = m[2] ? Number(m[2]) : min
  return { minDays: min, maxDays: max }
}

/** English presentation text for a turnaround (generated, flagged as pending review with the rest of the EN copy). */
export function turnaroundEn({ minDays, maxDays }: Turnaround): string {
  if (minDays === maxDays) return minDays === 1 ? '1 business day' : `${minDays} business days`
  return `${minDays}–${maxDays} business days`
}

export const egpToMinorInt = (egp: number): number => {
  if (!Number.isInteger(egp) || egp < 0) throw new RangeError(`Expected a non-negative whole EGP amount, got ${egp}`)
  return egp * 100
}
