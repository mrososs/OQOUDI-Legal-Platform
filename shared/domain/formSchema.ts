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
  'select', 'radio', 'checkbox', 'multiselect', 'file', 'repeater',
] as const
export type FieldType = (typeof FIELD_TYPES)[number]

export const DISPLAY_ONLY_TYPES: readonly FieldType[] = ['section', 'help']
export const CHOICE_TYPES: readonly FieldType[] = ['select', 'radio', 'checkbox', 'multiselect']
export const MULTI_TYPES: readonly FieldType[] = ['checkbox', 'multiselect']

/** Column types allowed inside a repeater (a structured list such as parties, children, installments). */
export const COLUMN_TYPES = ['text', 'textarea', 'number', 'date', 'select'] as const
export type ColumnType = (typeof COLUMN_TYPES)[number]

export const REPEATER_MAX_ROWS = 50
export const REPEATER_DEFAULT_MAX_ROWS = 20
export const REPEATER_MAX_COLUMNS = 8

const fieldId = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/)

export const fieldOptionSchema = z.object({
  value: z.string().regex(/^[a-z0-9_]{1,40}$/),
  label: localizedSchema,
})

export const repeaterColumnSchema = z
  .object({
    id: fieldId,
    type: z.enum(COLUMN_TYPES),
    label: localizedSchema,
    required: z.boolean().optional(),
    options: z.array(fieldOptionSchema).max(30).optional(),
    maxLength: z.number().int().min(1).max(2000).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .superRefine((c, ctx) => {
    if (c.type === 'select' && (!c.options || c.options.length < 1)) {
      ctx.addIssue({ code: 'custom', message: 'options_required', path: ['options'] })
    }
    if (c.options && new Set(c.options.map(o => o.value)).size !== c.options.length) {
      ctx.addIssue({ code: 'custom', message: 'options_unique', path: ['options'] })
    }
    if (c.min != null && c.max != null && c.min > c.max) {
      ctx.addIssue({ code: 'custom', message: 'number_range', path: ['min'] })
    }
  })

export type RepeaterColumn = z.infer<typeof repeaterColumnSchema>

export const formFieldSchema = z
  .object({
    id: fieldId,
    type: z.enum(FIELD_TYPES),
    label: localizedSchema,
    help: optionalLocalizedSchema.optional(),
    placeholder: optionalLocalizedSchema.optional(),
    required: z.boolean().optional(),
    /**
     * The source does not state whether this input is mandatory (or it is situational), so it is
     * not enforced; a lawyer/admin must confirm before it is made required.
     */
    legalReview: z.boolean().optional(),
    options: z.array(fieldOptionSchema).max(30).optional(),
    minLength: z.number().int().min(0).max(10000).optional(),
    maxLength: z.number().int().min(1).max(20000).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    accept: z.array(z.enum(ALLOWED_EXTENSIONS)).min(1).optional(),
    maxSizeMb: z.number().int().min(1).max(MAX_UPLOAD_MB).optional(),
    maxFiles: z.number().int().min(1).max(10).optional(),
    /** repeater only */
    columns: z.array(repeaterColumnSchema).min(1).max(REPEATER_MAX_COLUMNS).optional(),
    minItems: z.number().int().min(1).max(REPEATER_MAX_ROWS).optional(),
    maxItems: z.number().int().min(1).max(REPEATER_MAX_ROWS).optional(),
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
    if (f.type === 'repeater') {
      if (!f.columns || f.columns.length < 1) {
        ctx.addIssue({ code: 'custom', message: 'columns_required', path: ['columns'] })
      } else if (new Set(f.columns.map(c => c.id)).size !== f.columns.length) {
        ctx.addIssue({ code: 'custom', message: 'columns_unique', path: ['columns'] })
      }
      if (f.minItems != null && f.maxItems != null && f.minItems > f.maxItems) {
        ctx.addIssue({ code: 'custom', message: 'items_range', path: ['minItems'] })
      }
    }
    else if (f.columns || f.minItems != null || f.maxItems != null) {
      ctx.addIssue({ code: 'custom', message: 'columns_repeater_only', path: ['columns'] })
    }
    if (f.legalReview && f.required) {
      ctx.addIssue({ code: 'custom', message: 'review_not_required', path: ['legalReview'] })
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

/** One row of a repeater: column id → text or number. */
export type RepeaterRow = Record<string, string | number>

/** Value shapes: text/textarea/date/select/radio → string, number → number,
 * checkbox/multiselect → string[], file → document id[], repeater → row[] */
export type AnswerValue = string | number | string[] | RepeaterRow[] | null | undefined
export type Answers = Record<string, AnswerValue>

export type FieldErrorCode =
  | 'required' | 'requiredChoice' | 'requiredFile' | 'requiredRows'
  | 'minLength' | 'maxLength' | 'min' | 'max'
  | 'invalidNumber' | 'invalidDate' | 'invalidOption' | 'tooManyFiles' | 'invalidValue'
  | 'rowInvalid' | 'rowRequired' | 'minItems' | 'maxItems'

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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DEFAULT_COLUMN_TEXT_MAX = 500
const DEFAULT_COLUMN_TEXTAREA_MAX = 2000

function isBlankCell(v: unknown): boolean {
  return v == null || (typeof v === 'string' && v.trim() === '')
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Validates one repeater cell. Returns an error code or null. */
function validateColumn(col: RepeaterColumn, v: unknown): FieldErrorCode | null {
  switch (col.type) {
    case 'text':
    case 'textarea': {
      if (typeof v !== 'string') return 'invalidValue'
      const max = col.maxLength ?? (col.type === 'text' ? DEFAULT_COLUMN_TEXT_MAX : DEFAULT_COLUMN_TEXTAREA_MAX)
      return v.trim().length > max ? 'maxLength' : null
    }
    case 'number': {
      const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : Number.NaN
      if (!Number.isFinite(n)) return 'invalidNumber'
      if (col.min != null && n < col.min) return 'min'
      if (col.max != null && n > col.max) return 'max'
      return null
    }
    case 'date':
      return typeof v === 'string' && ISO_DATE_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ? null : 'invalidDate'
    case 'select':
      return typeof v === 'string' && col.options?.some(o => o.value === v) ? null : 'invalidOption'
    default:
      return 'invalidValue'
  }
}

/** Rows with at least one filled cell, cleaned (trimmed strings, numbers as numbers). Unknown keys are dropped. */
function cleanRepeaterRows(columns: RepeaterColumn[], value: unknown[]): RepeaterRow[] {
  const rows: RepeaterRow[] = []
  for (const raw of value) {
    if (!isRecord(raw)) continue
    const row: RepeaterRow = {}
    for (const col of columns) {
      const v = raw[col.id]
      if (isBlankCell(v)) continue
      row[col.id] = col.type === 'number' ? Number(v) : typeof v === 'string' ? v.trim() : (v as number)
    }
    if (Object.keys(row).length) rows.push(row)
  }
  return rows
}

function validateRepeater(field: FormField, value: AnswerValue): FieldError | null {
  const columns = field.columns ?? []
  if (value == null || value === '') return field.required ? { code: 'requiredRows' } : null
  if (!Array.isArray(value) || value.some(r => !isRecord(r))) return { code: 'invalidValue' }
  const raw = value as unknown[]
  const maxItems = field.maxItems ?? REPEATER_DEFAULT_MAX_ROWS
  if (raw.length > maxItems + 5) return { code: 'maxItems', params: { max: maxItems } }
  const rows = cleanRepeaterRows(columns, raw)
  if (rows.length === 0) return field.required ? { code: 'requiredRows' } : null
  if (rows.length > maxItems) return { code: 'maxItems', params: { max: maxItems } }
  const minItems = field.minItems ?? (field.required ? 1 : 0)
  if (rows.length < minItems) return { code: 'minItems', params: { min: minItems } }
  for (const [i, row] of rows.entries()) {
    for (const col of columns) {
      const v = row[col.id]
      if (v === undefined) {
        if (col.required) return { code: 'rowRequired', params: { row: i + 1, column: col.id } }
        continue
      }
      const code = validateColumn(col, v)
      if (code) return { code: 'rowInvalid', params: { row: i + 1, column: col.id } }
    }
  }
  return null
}

export function validateField(field: FormField, value: AnswerValue): FieldError | null {
  if (DISPLAY_ONLY_TYPES.includes(field.type)) return null
  if (field.type === 'repeater') return validateRepeater(field, value)

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
      if (new Set(value as string[]).size !== value.length) return { code: 'invalidOption' }
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
  /** Answers restricted to known input fields and normalized (numbers as numbers, trimmed strings, cleaned repeater rows). */
  normalized: Record<string, string | number | string[] | RepeaterRow[]>
  /** Document ids referenced by file fields, keyed by field id. */
  documentIdsByField: Record<string, string[]>
}

/**
 * Validates a full submission. Unknown keys are dropped (never stored).
 */
export function validateAnswers(fields: FormField[], answers: Answers): AnswersValidation {
  const errors: Record<string, FieldError> = {}
  const normalized: Record<string, string | number | string[] | RepeaterRow[]> = {}
  const documentIdsByField: Record<string, string[]> = {}

  for (const field of fields) {
    if (DISPLAY_ONLY_TYPES.includes(field.type)) continue
    const value = answers[field.id]
    const error = validateField(field, value)
    if (error) {
      errors[field.id] = error
      continue
    }
    if (field.type === 'repeater') {
      const rows = Array.isArray(value) ? cleanRepeaterRows(field.columns ?? [], value as unknown[]) : []
      if (rows.length) normalized[field.id] = rows
      continue
    }
    if (isEmpty(value)) continue
    if (field.type === 'number') normalized[field.id] = Number(value)
    else if (typeof value === 'string') normalized[field.id] = value.trim()
    else if (Array.isArray(value)) normalized[field.id] = [...(value as string[])]
    if (field.type === 'file' && Array.isArray(value)) documentIdsByField[field.id] = [...(value as string[])]
  }

  return { ok: Object.keys(errors).length === 0, errors, normalized, documentIdsByField }
}

function describeRepeaterRow(
  columns: RepeaterColumn[],
  row: Record<string, unknown>,
  locale: string,
  pick: (v: { ar: string, en?: string | null } | undefined) => string,
  formatDate: (ymd: string) => string,
): string {
  const parts: string[] = []
  for (const col of columns) {
    const v = row[col.id]
    if (isBlankCell(v)) continue
    let text: string
    if (col.type === 'select') text = pick(col.options?.find(o => o.value === v)?.label) || String(v)
    else if (col.type === 'date' && typeof v === 'string') text = formatDate(v)
    else if (col.type === 'number') text = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(Number(v))
    else text = String(v)
    parts.push(`${pick(col.label)}: ${text}`)
  }
  return parts.join(' | ')
}

/** Human-readable [label, value] pairs for review screens and lawyer views. Repeater rows are newline-separated. */
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
    if (field.type === 'repeater') {
      const rows = Array.isArray(v) ? v.filter(isRecord) : []
      if (!rows.length) continue
      text = rows.map((row, i) => `${i + 1}) ${describeRepeaterRow(field.columns ?? [], row, locale, pick, formatDate)}`).join('\n')
    } else if (CHOICE_TYPES.includes(field.type)) {
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
