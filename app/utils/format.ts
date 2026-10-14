export const CAIRO_TZ = 'Africa/Cairo'

function intlLocale(locale: string): string {
  return locale === 'en' ? 'en-GB' : 'ar-EG'
}

function fmt(value: string | number | Date, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: CAIRO_TZ, ...options }).format(new Date(value))
}

/** 6 أكتوبر 2026 */
export function formatDate(value: string | Date, locale: string): string {
  return fmt(value, locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** 6 أكتوبر */
export function formatShortDate(value: string | Date, locale: string): string {
  return fmt(value, locale, { day: 'numeric', month: 'short' })
}

/** 6 أكتوبر، 9:30 ص */
export function formatDateTime(value: string | Date, locale: string): string {
  return fmt(value, locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

/** الخميس، 15 أكتوبر */
export function formatDay(value: string | Date, locale: string): string {
  return fmt(value, locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

/** 11:00 ص */
export function formatTime(value: string | Date, locale: string): string {
  return fmt(value, locale, { hour: 'numeric', minute: '2-digit' })
}

/** Date-only answers (YYYY-MM-DD) are calendar dates — format at Cairo noon. */
export function formatYmd(ymd: string, locale: string): string {
  return formatDate(`${ymd}T12:00:00+02:00`, locale)
}

/** YYYY-MM-DD of an instant in Cairo. */
export function cairoYmd(value: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CAIRO_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
}

export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(n)
}

export function formatBytes(bytes: number, locale: string): string {
  const ar = locale !== 'en'
  if (bytes >= 1048576) {
    const v = new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US', { maximumFractionDigits: 1 }).format(bytes / 1048576)
    return ar ? `${v} م.ب` : `${v} MB`
  }
  const v = formatNumber(Math.max(1, Math.round(bytes / 1024)), locale)
  return ar ? `${v} ك.ب` : `${v} KB`
}
