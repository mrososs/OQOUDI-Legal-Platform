import { z } from 'zod'
import { localizedSchema, optionalLocalizedSchema } from './localized'
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_MB } from './uploads'

/**
 * Dynamic service request forms.
 * One schema drives: the admin form builder, the public form renderer,
 * client-side validation and server-side validation of submissions.
 * Stored as an immutable array in service_form_versions.fields.
 */
export const FIELD_TYPES = [
  'section', 'help', 'text', 'textarea', 'number', 'date',
  'select', 'radio', 'checkbox', 'multiselect', 'file',
] as const
export type FieldType = (typeof FIELD_TYPES)[number]

export const DISPLAY_ONLY_TYPES: readonly FieldType[] = ['section', 'help']
export const CHOICE_TYPES: readonly FieldType[] = ['select', 'radio', 'checkbox', 'multiselect']
export const MULTI_TYPES: readonly FieldType[] = ['checkbox', 'multiselect']

const fieldId = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/)

export const fieldOptionSchema = z.object({
  value: z.string().regex(/^[a-z0-9_]{1,40}$/),
  label: localizedSchema,
})

export const formFieldSchema = z
  .object({
    id: fieldId,
    type: z.enum(FIELD_TYPES),
    label: localizedSchema,
    help: optionalLocalizedSchema.optional(),
    placeholder: optionalLocalizedSchema.optional(),
    required: z.boolean().optional(),
    options: z.array(fieldOptionSchema).max(30).optional(),
    minLength: z.number().int().min(0).max(10000).optional(),
    maxLength: z.number().int().min(1).max(20000).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    accept: z.array(z.enum(ALLOWED_EXTENSIONS)).min(1).optional(),
    maxSizeMb: z.number().int().min(1).max(MAX_UPLOAD_MB).optional(),
    maxFiles: z.number().int().min(1).max(10).optional(),
  })
  .superRefine((f, ctx) => {
    if (CHOICE_TYPES.includes(f.type)) {
      if (!f.options || f.options.length < 1) {
        ctx.addIssue({ code: 'custom', message: 'options_required', path: ['options'] })
      } else if (new Set(f.options.map(o => o.value)).size !== f.options.length) {
        ctx.addIssue({ code: 'custom', message: 'options_unique', path: ['options'] })
      }
    }
    if (f.minLength != null && f.maxLength != null && f.minLength > f.maxLength) {
      ctx.addIssue({ code: 'custom', message: 'length_range', path: ['minLength'] })
    }
    if (f.min != null && f.max != null && f.min > f.max) {
      ctx.addIssue({ code: 'custom', message: 'number_range', path: ['min'] })
    }
    if (DISPLAY_ONLY_TYPES.includes(f.type) && f.required) {
      ctx.addIssue({ code: 'custom', message: 'display_not_required', path: ['required'] })
    }
  })

export type FormField = z.infer<typeof formFieldSchema>

export const formFieldsSchema = z
  .array(formFieldSchema)
  .max(60)
  .superRefine((fields, ctx) => {
    const ids = fields.map(f => f.id)
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: 'field_ids_unique' })
    }
    if (!fields.some(f => !DISPLAY_ONLY_TYPES.includes(f.type))) {
      ctx.addIssue({ code: 'custom', message: 'form_needs_input' })
    }
  })

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

/** Value shapes: text/textarea/date/select/radio → string, number → number,
 * checkbox/multiselect → string[], file → document id[] */
export type AnswerValue = string | number | string[] | null | undefined
export type Answers = Record<string, AnswerValue>

export type FieldErrorCode =
  | 'required' | 'requiredChoice' | 'requiredFile'
  | 'minLength' | 'maxLength' | 'min' | 'max'
  | 'invalidNumber' | 'invalidDate' | 'invalidOption' | 'tooManyFiles' | 'invalidValue'

export interface FieldError {
  code: FieldErrorCode
  params?: Record<string, number | string>
}

const DEFAULT_TEXT_MAX = 500
const DEFAULT_TEXTAREA_MAX = 6000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isEmpty(v: AnswerValue): boolean {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0)
}

export function validateField(field: FormField, value: AnswerValue): FieldError | null {
  if (DISPLAY_ONLY_TYPES.includes(field.type)) return null

  if (isEmpty(value)) {
    if (!field.required) return null
    if (field.type === 'file') return { code: 'requiredFile' }
    if (CHOICE_TYPES.includes(field.type)) return { code: 'requiredChoice' }
    return { code: 'required' }
  }

  switch (field.type) {
    case 'text':
    case 'textarea': {
      if (typeof value !== 'string') return { code: 'invalidValue' }
      const len = value.trim().length
      if (field.required && len === 0) return { code: 'required' }
      if (field.minLength != null && len < field.minLength) return { code: 'minLength', params: { min: field.minLength } }
      const max = field.maxLength ?? (field.type === 'text' ? DEFAULT_TEXT_MAX : DEFAULT_TEXTAREA_MAX)
      if (len > max) return { code: 'maxLength', params: { max } }
      return null
    }
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value)
      if (typeof value === 'object' || !Number.isFinite(n)) return { code: 'invalidNumber' }
      if (field.min != null && n < field.min) return { code: 'min', params: { min: field.min } }
      if (field.max != null && n > field.max) return { code: 'max', params: { max: field.max } }
      return null
    }
    case 'date': {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
        return { code: 'invalidDate' }
      }
      return null
    }
    case 'select':
    case 'radio': {
      if (typeof value !== 'string' || !field.options?.some(o => o.value === value)) return { code: 'invalidOption' }
      return null
    }
    case 'checkbox':
    case 'multiselect': {
      if (!Array.isArray(value) || value.some(v => typeof v !== 'string' || !field.options?.some(o => o.value === v))) {
        return { code: 'invalidOption' }
      }
      if (new Set(value).size !== value.length) return { code: 'invalidOption' }
      return null
    }
    case 'file': {
      if (!Array.isArray(value) || value.some(v => typeof v !== 'string' || !UUID_RE.test(v))) return { code: 'invalidValue' }
      const max = field.maxFiles ?? 5
      if (value.length > max) return { code: 'tooManyFiles', params: { max } }
      return null
    }
    default:
      return { code: 'invalidValue' }
  }
}

export interface AnswersValidation {
  ok: boolean
  errors: Record<string, FieldError>
  /** Answers restricted to known input fields and normalized (numbers as numbers, trimmed strings). */
  normalized: Record<string, string | number | string[]>
  /** Document ids referenced by file fields, keyed by field id. */
  documentIdsByField: Record<string, string[]>
}

/**
 * Validates a full submission. Unknown keys are dropped (never stored).
 */
export function validateAnswers(fields: FormField[], answers: Answers): AnswersValidation {
  const errors: Record<string, FieldError> = {}
  const normalized: Record<string, string | number | string[]> = {}
  const documentIdsByField: Record<string, string[]> = {}

  for (const field of fields) {
    if (DISPLAY_ONLY_TYPES.includes(field.type)) continue
    const value = answers[field.id]
    const error = validateField(field, value)
    if (error) {
      errors[field.id] = error
      continue
    }
    if (isEmpty(value)) continue
    if (field.type === 'number') normalized[field.id] = Number(value)
    else if (typeof value === 'string') normalized[field.id] = value.trim()
    else if (Array.isArray(value)) normalized[field.id] = [...value]
    if (field.type === 'file' && Array.isArray(value)) documentIdsByField[field.id] = [...value]
  }

  return { ok: Object.keys(errors).length === 0, errors, normalized, documentIdsByField }
}

/** Human-readable [label, value] pairs for review screens and lawyer views. */
export function describeAnswers(
  fields: FormField[],
  answers: Record<string, unknown>,
  locale: string,
  pick: (v: { ar: string, en?: string | null } | undefined) => string,
  formatDate: (ymd: string) => string,
): { fieldId: string, label: string, value: string, type: FieldType }[] {
  const out: { fieldId: string, label: string, value: string, type: FieldType }[] = []
  for (const field of fields) {
    if (DISPLAY_ONLY_TYPES.includes(field.type) || field.type === 'file') continue
    const v = answers[field.id]
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) continue
    let text: string
    if (CHOICE_TYPES.includes(field.type)) {
      const values = Array.isArray(v) ? v : [v]
      text = values
        .map(x => pick(field.options?.find(o => o.value === x)?.label) || String(x))
        .join(locale === 'en' ? ', ' : '، ')
    } else if (field.type === 'date' && typeof v === 'string') {
      text = formatDate(v)
    } else if (field.type === 'number') {
      text = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(Number(v))
    } else {
      text = String(v)
    }
    out.push({ fieldId: field.id, label: pick(field.label), value: text, type: field.type })
  }
  return out
}
