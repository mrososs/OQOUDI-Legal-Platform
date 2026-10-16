import type { Remaining } from '#shared/domain/pricing'

const num = (n: number, _locale: string, pad = false) =>
  new Intl.NumberFormat('en-US', { minimumIntegerDigits: pad ? 2 : 1, useGrouping: false }).format(n)

const AR = {
  day: (n: number) => (n >= 2 && n <= 10 ? 'أيام' : 'يوم'),
  hour: (n: number) => (n >= 2 && n <= 10 ? 'ساعات' : 'ساعة'),
  minute: (n: number) => (n >= 2 && n <= 10 ? 'دقائق' : 'دقيقة'),
  second: (n: number) => (n >= 2 && n <= 10 ? 'ثوانٍ' : 'ثانية'),
}
const en = (n: number, unit: string) => `${unit}${n === 1 ? '' : 's'}`

/**
 * «12 يوم، 08 ساعات، 35 دقيقة» / "12 days, 08 hours, 35 minutes".
 * In the last hour it switches to minutes and seconds so the countdown visibly moves.
 */
export function formatRemaining(r: Remaining, locale: string): string {
  const english = locale === 'en'
  if (r.totalMs < 3_600_000) {
    return english
      ? `${num(r.minutes, locale, true)} ${en(r.minutes, 'minute')}, ${num(r.seconds, locale, true)} ${en(r.seconds, 'second')}`
      : `${num(r.minutes, locale, true)} ${AR.minute(r.minutes)}، ${num(r.seconds, locale, true)} ${AR.second(r.seconds)}`
  }
  return english
    ? `${num(r.days, locale)} ${en(r.days, 'day')}, ${num(r.hours, locale, true)} ${en(r.hours, 'hour')}, ${num(r.minutes, locale, true)} ${en(r.minutes, 'minute')}`
    : `${num(r.days, locale)} ${AR.day(r.days)}، ${num(r.hours, locale, true)} ${AR.hour(r.hours)}، ${num(r.minutes, locale, true)} ${AR.minute(r.minutes)}`
}
