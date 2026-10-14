/** Small validators shared by client forms and server routes. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EG_MOBILE_RE = /^(\+20|0)1[0125]\d{8}$/

export function isEgyptianMobile(value: string): boolean {
  return EG_MOBILE_RE.test(value.replace(/[\s-]/g, ''))
}

/** "+20 100 123 4567" / "01001234567" → "+201001234567" */
export function normalizeEgyptianMobile(value: string): string {
  const v = value.replace(/[\s-]/g, '')
  return v.startsWith('0') ? `+20${v.slice(1)}` : v
}

/** Mirrors the Supabase Auth policy: ≥ 8 chars with letters and digits. */
export function isStrongPassword(value: string): boolean {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value)
}
