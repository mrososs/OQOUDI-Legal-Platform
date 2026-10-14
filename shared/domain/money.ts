/**
 * Money is stored as integer minor units (piasters, 1 EGP = 100).
 * Never use floats for amounts.
 */
export const CURRENCY = 'EGP'

export function toMinor(pounds: number): number {
  if (!Number.isFinite(pounds) || pounds < 0) throw new RangeError('Invalid amount')
  return Math.round(pounds * 100)
}

export function fromMinor(minor: number): number {
  return minor / 100
}

/** `٢٬٥٠٠ ج.م` (ar) or `EGP 2,500` (en). Fractions shown only when present. */
export function formatMoney(minor: number, locale: string): string {
  const amount = fromMinor(minor)
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  if (locale === 'en') {
    return `EGP ${new Intl.NumberFormat('en-US', { minimumFractionDigits: fractionDigits, maximumFractionDigits: 2 }).format(amount)}`
  }
  return `${new Intl.NumberFormat('ar-EG', { minimumFractionDigits: fractionDigits, maximumFractionDigits: 2 }).format(amount)} ج.م`
}
