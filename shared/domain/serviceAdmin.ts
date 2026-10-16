import { z } from 'zod'
import { localizedSchema } from './localized'
import { serviceSectionInputSchema } from './serviceSections'
import { manualPaymentSettingsSchema } from './manualPayments'

/**
 * Service editor payload (admin). Validated in the browser for early
 * feedback and again on the server before `admin_save_service`.
 */
export const SERVICE_KINDS = ['standard', 'written_consultation', 'video_consultation'] as const
export const PRICING_TYPES = ['fixed', 'quote'] as const
export const SERVICE_STATUSES = ['draft', 'published', 'archived'] as const

const MAX_MINOR = 100_000_000_000

export const ADDON_KINDS = ['vip_delivery', 'bilingual_drafting'] as const
export type AddonKind = (typeof ADDON_KINDS)[number]
export const TRANSLATION_STATUSES = ['approved', 'pending_review'] as const

const minorSchema = z.number().int().positive().max(MAX_MINOR)

export const addonInputSchema = z
  .object({
    id: z.uuid().nullish(),
    /** VIP delivery / bilingual drafting are identified by `kind` (shown to staff on orders). */
    kind: z.enum(ADDON_KINDS).nullish(),
    title: localizedSchema,
    /** Regular price. null = no regular price approved: the add-on is only offered while its launch price applies. */
    priceMinor: minorSchema.nullable(),
    /** Price while the launch campaign is active. */
    launchPriceMinor: minorSchema.nullish(),
    isActive: z.boolean().default(true),
  })
  .superRefine((a, ctx) => {
    if (a.priceMinor == null && a.launchPriceMinor == null) {
      ctx.addIssue({ code: 'custom', message: 'addon_needs_price', path: ['priceMinor'] })
    }
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
    /** Client-approved launch price (explicit, never derived from a percentage). */
    launchPriceMinor: z.number().int().min(0).max(MAX_MINOR).nullish(),
    /** The launch campaign applies to this service. Consultations / quote services can never be eligible. */
    launchEligible: z.boolean().default(false),
    translationStatus: z.enum(TRANSLATION_STATUSES).optional(),
    meetingDurationMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).nullish(),
    isFeatured: z.boolean().default(false),
    sortOrder: z.number().int().min(0).max(10000).default(0),
    addons: z.array(addonInputSchema).max(20).default([]),
    sections: z.array(serviceSectionInputSchema).max(10),
  })
  .superRefine((s, ctx) => {
    if (s.launchPriceMinor != null && s.launchPriceMinor > s.basePriceMinor) {
      ctx.addIssue({ code: 'custom', message: 'launch_above_base', path: ['launchPriceMinor'] })
    }
    if (s.launchEligible && s.launchPriceMinor == null) {
      ctx.addIssue({ code: 'custom', message: 'launch_needs_price', path: ['launchPriceMinor'] })
    }
    if (s.launchEligible && (s.kind !== 'standard' || s.pricingType !== 'fixed')) {
      ctx.addIssue({ code: 'custom', message: 'launch_standard_only', path: ['launchEligible'] })
    }
    const activeKinds = s.addons.filter(a => a.isActive && a.kind).map(a => a.kind)
    if (new Set(activeKinds).size !== activeKinds.length) {
      ctx.addIssue({ code: 'custom', message: 'addon_kind_unique', path: ['addons'] })
    }
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
      launchPriceMinor: z.number().int().min(0).max(MAX_MINOR).nullish(),
      launchEligible: z.boolean().optional(),
    }))
    .min(1)
    .max(200),
})

/** Launch campaign (admin). `startDate`/`startTime` are Cairo local; the end is computed (15 calendar days later). */
export const campaignInputSchema = z
  .object({
    enabled: z.boolean(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('00:00'),
  })
  .superRefine((c, ctx) => {
    if (c.enabled && !c.startDate) ctx.addIssue({ code: 'custom', message: 'campaign_date_required', path: ['startDate'] })
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
  'payments.manual': manualPaymentSettingsSchema,
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
