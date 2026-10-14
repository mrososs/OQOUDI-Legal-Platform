import { z } from 'zod'
import { localizedSchema } from './localized'

export const SECTION_KEYS = ['about', 'who', 'included', 'deliverables', 'docs', 'steps', 'duration', 'pricing', 'faq', 'reviews'] as const
export type SectionKey = (typeof SECTION_KEYS)[number]

export const LIST_SECTIONS: readonly SectionKey[] = ['who', 'included', 'deliverables', 'docs']
export const DERIVED_SECTIONS: readonly SectionKey[] = ['duration', 'pricing', 'reviews']

const listSchema = z.array(localizedSchema).max(30)
const faqSchema = z.array(z.object({ q: localizedSchema, a: localizedSchema })).max(30)

export function sectionContentSchema(key: SectionKey) {
  if (key === 'about') return localizedSchema
  if (key === 'faq') return faqSchema
  if (key === 'steps' || LIST_SECTIONS.includes(key)) return listSchema
  return z.null()
}

export const serviceSectionInputSchema = z
  .object({
    key: z.enum(SECTION_KEYS),
    isEnabled: z.boolean(),
    content: z.unknown(),
  })
  .superRefine((s, ctx) => {
    const parsed = sectionContentSchema(s.key).safeParse(s.content ?? null)
    if (!parsed.success) {
      ctx.addIssue({ code: 'custom', message: `invalid_section_${s.key}`, path: ['content'] })
    }
  })

export type ServiceSectionInput = z.infer<typeof serviceSectionInputSchema>
