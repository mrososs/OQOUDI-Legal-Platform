import { z } from 'zod'

export type AppLocale = 'ar' | 'en'

/** Localized text stored as jsonb `{ ar, en }`. Arabic is required. */
export interface Localized {
  ar: string
  en?: string | null
}

export const localizedSchema = z.object({
  ar: z.string().trim().min(1).max(20000),
  en: z.string().trim().max(20000).nullish(),
})

export const optionalLocalizedSchema = z.object({
  ar: z.string().trim().max(20000),
  en: z.string().trim().max(20000).nullish(),
})

/** Picks the requested language, falling back to Arabic. */
export function localize(value: Localized | null | undefined, locale: string): string {
  if (!value) return ''
  if (locale === 'en' && value.en && value.en.trim()) return value.en
  return value.ar ?? ''
}

/** Narrowing helper for jsonb columns typed as `Json`. */
export function asLocalized(value: unknown): Localized | null {
  if (value && typeof value === 'object' && typeof (value as Localized).ar === 'string') {
    return value as Localized
  }
  return null
}
