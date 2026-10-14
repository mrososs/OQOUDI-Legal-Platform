import { formatMoney } from '#shared/domain/money'
import { localize, type Localized } from '#shared/domain/localized'

/** Locale-bound formatters for templates. */
export function useFormat() {
  const { locale } = useI18n()

  return {
    money: (minor: number) => formatMoney(minor, locale.value),
    date: (v: string | Date) => formatDate(v, locale.value),
    shortDate: (v: string | Date) => formatShortDate(v, locale.value),
    dateTime: (v: string | Date) => formatDateTime(v, locale.value),
    day: (v: string | Date) => formatDay(v, locale.value),
    time: (v: string | Date) => formatTime(v, locale.value),
    ymd: (v: string) => formatYmd(v, locale.value),
    number: (n: number) => formatNumber(n, locale.value),
    bytes: (n: number) => formatBytes(n, locale.value),
    text: (v: Localized | null | undefined | unknown) => localize(v as Localized | null, locale.value),
  }
}
