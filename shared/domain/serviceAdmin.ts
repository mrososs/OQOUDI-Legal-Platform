import { z } from 'zod'
import { localizedSchema } from './localized'
import { serviceSectionInputSchema } from './serviceSections'

/**
 * Service editor payload (admin). Validated in the browser for early
 * feedback and again on the server before `admin_save_service`.
 */
export const SERVICE_KINDS = ['standard', 'written_consultation', 'video_consultation'] as const
export const PRICING_TYPES = ['fixed', 'quote'] as const
export const SERVICE_STATUSES = ['draft', 'published', 'archived'] as const

const MAX_MINOR = 100_000_000_000

export const addonInputSchema = z.object({
  id: z.uuid().nullish(),
  title: localizedSchema,
  priceMinor: z.number().int().positive().max(MAX_MINOR),
  isActive: z.boolean().default(true),
})

export const serviceInputSchema = z
  .object({
    slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'invalid_slug'),
    kind: z.enum(SERVICE_KINDS),
    primaryCategoryId: z.uuid(),
    categoryIds: z.array(z.uuid()).max(10).default([]),
    title: localizedSchema,
    shortDescription: localizedSchema,
    deliveryEstimate: localizedSchema,
    pricingType: z.enum(PRICING_TYPES),
    basePriceMinor: z.number().int().min(0).max(MAX_MINOR),
    meetingDurationMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).nullish(),
    isFeatured: z.boolean().default(false),
    sortOrder: z.number().int().min(0).max(10000).default(0),
    addons: z.array(addonInputSchema).max(20).default([]),
    sections: z.array(serviceSectionInputSchema).max(10),
  })
  .superRefine((s, ctx) => {
    if (s.kind !== 'standard' && s.pricingType !== 'fixed') {
      ctx.addIssue({ code: 'custom', message: 'consultation_fixed', path: ['pricingType'] })
    }
    if (s.pricingType === 'quote' && s.basePriceMinor <= 0) {
      ctx.addIssue({ code: 'custom', message: 'quote_estimate', path: ['basePriceMinor'] })
    }
    if (s.pricingType === 'quote' && s.addons.some(a => a.isActive)) {
      ctx.addIssue({ code: 'custom', message: 'quote_no_addons', path: ['addons'] })
    }
    if (s.kind === 'video_consultation' && !s.meetingDurationMinutes) {
      ctx.addIssue({ code: 'custom', message: 'meeting_duration', path: ['meetingDurationMinutes'] })
    }
    if (new Set(s.sections.map(x => x.key)).size !== s.sections.length) {
      ctx.addIssue({ code: 'custom', message: 'sections_unique', path: ['sections'] })
    }
  })

export type ServiceInput = z.infer<typeof serviceInputSchema>

export const priceUpdateSchema = z.object({
  prices: z
    .array(z.object({
      serviceId: z.uuid(),
      pricingType: z.enum(PRICING_TYPES),
      basePriceMinor: z.number().int().min(0).max(MAX_MINOR),
    }))
    .min(1)
    .max(200),
})

/** "600" | "600.5" | "600.50" → 60050 minor units, without float math. null when invalid. */
export function egpToMinor(input: string | number | null | undefined): number | null {
  const s = String(input ?? '').trim().replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  const m = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(s)
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
}

/** 60050 → "600.50", 60000 → "600" (for input fields). */
export function minorToEgpInput(minor: number): string {
  const whole = Math.trunc(minor / 100)
  const frac = minor % 100
  return frac ? `${whole}.${String(frac).padStart(2, '0')}` : String(whole)
}

// ---------------------------------------------------------------------------
// Settings payloads (platform_settings keys)
// ---------------------------------------------------------------------------
export const contactSettingSchema = z.object({
  phone: z.string().trim().min(6).max(30),
  email: z.email(),
  hours: localizedSchema,
  address: localizedSchema,
})

export const bookingSettingSchema = z.object({
  slot_minutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
  lead_minutes: z.number().int().min(0).max(10080),
  horizon_days: z.number().int().min(1).max(365),
  hold_minutes: z.number().int().min(5).max(120),
})

export const defaultLawyerSettingSchema = z.object({
  lawyer_id: z.uuid().nullable(),
})

export const SETTING_SCHEMAS = {
  'contact': contactSettingSchema,
  'booking': bookingSettingSchema,
  'assignment.default_lawyer': defaultLawyerSettingSchema,
} as const

export type SettingKey = keyof typeof SETTING_SCHEMAS

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export const availabilityRulesSchema = z.object({
  rules: z
    .array(z.object({ weekday: z.number().int().min(0).max(6), startTime: time, endTime: time }))
    .max(28)
    .superRefine((rules, ctx) => {
      rules.forEach((r, i) => {
        if (r.endTime <= r.startTime) ctx.addIssue({ code: 'custom', message: 'time_range', path: [i, 'endTime'] })
      })
    }),
})

export const availabilityExceptionSchema = z
  .object({
    date: z.iso.date(),
    startTime: time.nullish(),
    endTime: time.nullish(),
    reason: z.string().trim().max(200).nullish(),
  })
  .superRefine((e, ctx) => {
    if (!!e.startTime !== !!e.endTime) ctx.addIssue({ code: 'custom', message: 'time_pair', path: ['endTime'] })
    if (e.startTime && e.endTime && e.endTime <= e.startTime) ctx.addIssue({ code: 'custom', message: 'time_range', path: ['endTime'] })
  })
