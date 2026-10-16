/**
 * Contract spec DSL → dynamic form (`service_form_versions.fields`).
 *
 * One spec file per contract (scripts/catalog-import/data/specs/<REF>.json). A spec maps the
 * client's source columns to form fields:
 *
 *   E (party information)            → `parties` / `partyFields`   → step "Party details"
 *   F (technical & financial info)   → `details` / `financial`     → steps "Contract details", "Financial and technical information"
 *   G (special / additional terms)   → `special`                   → step "Special and additional conditions" (customer choices)
 *   H (documents to upload)          → `documents`                 → step "Required documents"
 *
 * Every source item (the column text split on top-level commas: E1, F3, G2, H1 …) must be
 * referenced by at least one field's `src` — `validateSpec` enforces full coverage so no
 * requested information is silently dropped.
 */
import { z } from 'zod'
import {
  COLUMN_TYPES,
  formFieldsSchema,
  type FormField,
} from '../domain/formSchema'
import { ALLOWED_EXTENSIONS } from '../domain/uploads'
import {
  allItemRefs,
  itemRef,
  sourceItems,
  splitItems,
  type SourceColumn,
  type SourceContract,
} from './source'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const idRe = /^[a-z][a-z0-9_]{0,39}$/
const bilingual = z.object({ ar: z.string().trim().min(1), en: z.string().trim().min(1) }).strict()

/**
 * yes    — unconditional: enforced as a required field.
 * no     — optional (explicit "إن وجد/اختياري" wording in the source, or a customer choice in column G).
 * review — the source does not make the mandatory status clear: NOT enforced, flagged `legalReview`.
 */
export const REQ = ['yes', 'no', 'review'] as const
export type Req = (typeof REQ)[number]

const srcRefs = z.array(z.string().regex(/^[EFGH][1-9]\d?$/)).min(1)
const optionSpec = z.object({
  value: z.string().regex(/^[a-z0-9_]{1,40}$/),
  ar: z.string().trim().min(1),
  en: z.string().trim().min(1),
}).strict()
const columnSpec = z.object({
  id: z.string().regex(idRe),
  type: z.enum(COLUMN_TYPES),
  ar: z.string().trim().min(1),
  en: z.string().trim().min(1),
  required: z.boolean().optional(),
  options: z.array(optionSpec).optional(),
  maxLength: z.number().int().positive().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
}).strict()

const FIELD_TYPES_IN_SPEC = ['text', 'textarea', 'number', 'date', 'select', 'radio', 'checkbox', 'multiselect', 'file', 'repeater'] as const

const fieldBase = {
  id: z.string().regex(idRe),
  type: z.enum(FIELD_TYPES_IN_SPEC),
  ar: z.string().trim().min(1),
  en: z.string().trim().min(1),
  req: z.enum(REQ),
  help: bilingual.optional(),
  options: z.array(optionSpec).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().positive().optional(),
  columns: z.array(columnSpec).optional(),
  minItems: z.number().int().positive().optional(),
  maxItems: z.number().int().positive().optional(),
  accept: z.array(z.enum(ALLOWED_EXTENSIONS)).optional(),
  maxFiles: z.number().int().min(1).max(10).optional(),
  maxSizeMb: z.number().int().min(1).max(25).optional(),
}
export const fieldSpecSchema = z.object({ ...fieldBase, src: srcRefs }).strict()
export type FieldSpec = z.infer<typeof fieldSpecSchema>

/** Party-field vocabulary — labels are fixed so every contract words them identically. */
export const PARTY_KINDS = {
  name: { ar: 'الاسم الكامل', en: 'Full name', type: 'text', maxLength: 160 },
  national_id: { ar: 'الرقم القومي', en: 'National ID number', type: 'text', maxLength: 30 },
  national_id_or_passport: { ar: 'الرقم القومي أو رقم جواز السفر', en: 'National ID or passport number', type: 'text', maxLength: 40 },
  address: { ar: 'العنوان', en: 'Address', type: 'text', maxLength: 300 },
  residence: { ar: 'محل الإقامة', en: 'Place of residence', type: 'text', maxLength: 300 },
  birth_date: { ar: 'تاريخ الميلاد', en: 'Date of birth', type: 'date' },
  commercial_register: { ar: 'رقم السجل التجاري', en: 'Commercial register number', type: 'text', maxLength: 60 },
  tax_card: { ar: 'رقم البطاقة الضريبية', en: 'Tax card number', type: 'text', maxLength: 60 },
  company_name: { ar: 'اسم الشركة / المنشأة', en: 'Company / entity name', type: 'text', maxLength: 200 },
  legal_rep: { ar: 'الممثل القانوني', en: 'Legal representative', type: 'text', maxLength: 160 },
} as const
export type PartyKind = keyof typeof PARTY_KINDS

const partyFieldSpec = z.union([
  z.enum(Object.keys(PARTY_KINDS) as [PartyKind, ...PartyKind[]]),
  z.object({ kind: z.enum(Object.keys(PARTY_KINDS) as [PartyKind, ...PartyKind[]]), req: z.enum(REQ) }).strict(),
  z.object({ ...fieldBase }).strict(),
])

export const partySpecSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,19}$/),
  ar: z.string().trim().min(1),
  en: z.string().trim().min(1),
  src: srcRefs,
  fields: z.array(partyFieldSpec).min(1),
}).strict()

export const contractSpecSchema = z.object({
  ref: z.string().regex(/^(IND|CO)-\d{3}$/),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80),
  /** English presentation copy. Generated, NOT lawyer-approved: flagged `pending_review`. */
  en: z.object({ title: z.string().trim().min(1), description: z.string().trim().min(1) }).strict(),
  parties: z.array(partySpecSchema).default([]),
  partyFields: z.array(fieldSpecSchema).default([]),
  details: z.array(fieldSpecSchema).default([]),
  financial: z.array(fieldSpecSchema).default([]),
  special: z.array(fieldSpecSchema).default([]),
  documents: z.array(fieldSpecSchema).default([]),
}).strict()
export type ContractSpec = z.infer<typeof contractSpecSchema>

// ---------------------------------------------------------------------------
// Compile
// ---------------------------------------------------------------------------

export const STEP_SECTIONS = {
  parties: {
    id: 'step_parties',
    label: { ar: 'بيانات الأطراف', en: 'Party details' },
    help: { ar: 'أدخل البيانات كما ستظهر في العقد.', en: 'Enter the details as they should appear in the contract.' },
  },
  details: {
    id: 'step_details',
    label: { ar: 'تفاصيل العقد', en: 'Contract details' },
    help: undefined,
  },
  financial: {
    id: 'step_financial',
    label: { ar: 'البيانات المالية والفنية', en: 'Financial and technical information' },
    help: undefined,
  },
  special: {
    id: 'step_special',
    label: { ar: 'الشروط الخاصة والإضافية', en: 'Special and additional conditions' },
    help: { ar: 'اختياراتك بشأن الشروط الخاصة — اترك الحقل فارغًا إذا لم ينطبق.', en: 'Your choices for special terms — leave a field empty if it does not apply.' },
  },
  documents: {
    id: 'step_documents',
    label: { ar: 'المستندات المطلوبة', en: 'Required documents' },
    help: { ar: 'ارفع نسخًا واضحة من كل مستند. الحقول المعلّمة بـ * إلزامية.', en: 'Upload a clear copy of each document. Fields marked * are required.' },
  },
} as const

const DEFAULT_ACCEPT = ['pdf', 'jpg', 'png'] as const

export interface CompiledField {
  field: FormField
  /** Source item references this field covers (empty for section headings). */
  src: string[]
  req: Req | 'section'
  group: keyof typeof STEP_SECTIONS
}

function toField(s: Omit<FieldSpec, 'src'> & { id: string }, labelOverride?: { ar: string, en: string }): FormField {
  const field: FormField = {
    id: s.id,
    type: s.type,
    label: labelOverride ?? { ar: s.ar, en: s.en },
  }
  if (s.req === 'yes') field.required = true
  if (s.req === 'review') field.legalReview = true
  if (s.help) field.help = s.help
  if (s.options?.length) field.options = s.options.map(o => ({ value: o.value, label: { ar: o.ar, en: o.en } }))
  if (s.min != null) field.min = s.min
  if (s.max != null) field.max = s.max
  if (s.minLength != null) field.minLength = s.minLength
  if (s.maxLength != null) field.maxLength = s.maxLength
  else if (s.type === 'text') field.maxLength = 300
  else if (s.type === 'textarea') field.maxLength = 2000
  if (s.type === 'file') {
    field.accept = [...(s.accept ?? DEFAULT_ACCEPT)]
    field.maxFiles = s.maxFiles ?? 5
    field.maxSizeMb = s.maxSizeMb ?? 10
  }
  if (s.type === 'repeater') {
    field.columns = (s.columns ?? []).map(c => ({
      id: c.id,
      type: c.type,
      label: { ar: c.ar, en: c.en },
      ...(c.required ? { required: true } : {}),
      ...(c.options?.length ? { options: c.options.map(o => ({ value: o.value, label: { ar: o.ar, en: o.en } })) } : {}),
      ...(c.maxLength != null ? { maxLength: c.maxLength } : {}),
      ...(c.min != null ? { min: c.min } : {}),
      ...(c.max != null ? { max: c.max } : {}),
    }))
    if (s.minItems != null) field.minItems = s.minItems
    field.maxItems = s.maxItems ?? 20
  }
  return field
}

function expandParty(p: z.infer<typeof partySpecSchema>): { spec: Omit<FieldSpec, 'src'>, src: string[] }[] {
  return p.fields.map((pf) => {
    if (typeof pf === 'string' || 'kind' in pf) {
      const kind = (typeof pf === 'string' ? pf : pf.kind) as PartyKind
      const req: Req = typeof pf === 'string' ? 'yes' : pf.req
      const k = PARTY_KINDS[kind]
      return {
        spec: {
          id: `${p.key}_${kind}`,
          type: k.type,
          ar: `${k.ar} — ${p.ar}`,
          en: `${k.en} — ${p.en}`,
          req,
          ...('maxLength' in k ? { maxLength: k.maxLength } : {}),
        } as Omit<FieldSpec, 'src'>,
        src: p.src,
      }
    }
    // custom field belonging to the party: namespaced id and label suffix
    return {
      spec: { ...pf, id: `${p.key}_${pf.id}`, ar: `${pf.ar} — ${p.ar}`, en: `${pf.en} — ${p.en}` } as Omit<FieldSpec, 'src'>,
      src: p.src,
    }
  })
}

function section(group: keyof typeof STEP_SECTIONS): CompiledField {
  const s = STEP_SECTIONS[group]
  return {
    field: { id: s.id, type: 'section', label: s.label, ...(s.help ? { help: s.help } : {}) },
    src: [],
    req: 'section',
    group,
  }
}

/** Compiles a spec into the ordered field list plus a per-field source map. */
export function compileSpec(spec: ContractSpec): CompiledField[] {
  const out: CompiledField[] = []
  const push = (group: keyof typeof STEP_SECTIONS, list: { spec: Omit<FieldSpec, 'src'>, src: string[] }[]) => {
    if (!list.length) return
    out.push(section(group))
    for (const { spec: s, src } of list) out.push({ field: toField(s), src, req: s.req, group })
  }
  push('parties', [
    ...spec.parties.flatMap(expandParty),
    ...spec.partyFields.map(f => ({ spec: f, src: f.src })),
  ])
  push('details', spec.details.map(f => ({ spec: f, src: f.src })))
  push('financial', spec.financial.map(f => ({ spec: f, src: f.src })))
  push('special', spec.special.map(f => ({ spec: f, src: f.src })))
  push('documents', spec.documents.map(f => ({ spec: f, src: f.src })))
  return out
}

// ---------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------

const OPTIONAL_MARKER = /إن وجد|إن وجدت|اختياري/
const GROUP_COLUMN: Record<keyof typeof STEP_SECTIONS, SourceColumn> = {
  parties: 'E', details: 'F', financial: 'F', special: 'G', documents: 'H',
}

export interface SpecReport {
  ref: string
  errors: string[]
  fieldCount: number
  inputCount: number
  required: number
  optional: number
  review: number
  fileFields: number
  requiredFiles: number
  repeaters: number
  itemsTotal: number
  itemsCovered: number
  /** Source items whose text carries an explicit optional marker. */
  explicitOptionalItems: string[]
}

export function validateSpec(contract: SourceContract, rawSpec: unknown): { spec: ContractSpec | null, report: SpecReport, compiled: CompiledField[] } {
  const report: SpecReport = {
    ref: contract.ref, errors: [], fieldCount: 0, inputCount: 0, required: 0, optional: 0, review: 0,
    fileFields: 0, requiredFiles: 0, repeaters: 0, itemsTotal: 0, itemsCovered: 0, explicitOptionalItems: [],
  }
  const parsed = contractSpecSchema.safeParse(rawSpec)
  if (!parsed.success) {
    report.errors.push(...parsed.error.issues.map(i => `schema: ${i.path.join('.')} — ${i.message}`))
    return { spec: null, report, compiled: [] }
  }
  const spec = parsed.data
  if (spec.ref !== contract.ref) report.errors.push(`ref ${spec.ref} does not match source ${contract.ref}`)

  const compiled = compileSpec(spec)
  report.fieldCount = compiled.length

  // ids unique across the whole form
  const seen = new Set<string>()
  for (const c of compiled) {
    if (seen.has(c.field.id)) report.errors.push(`duplicate field id "${c.field.id}"`)
    seen.add(c.field.id)
  }
  if (compiled.length > 60) report.errors.push(`${compiled.length} fields exceed the 60-field form limit`)

  // source coverage & column/group consistency
  const items = sourceItems(contract)
  const valid = new Set(allItemRefs(contract))
  const covered = new Set<string>()
  for (const c of compiled) {
    for (const ref of c.src) {
      if (!valid.has(ref)) report.errors.push(`field "${c.field.id}" references ${ref}, which does not exist in the source (${contract.ref})`)
      else covered.add(ref)
      if (c.group !== undefined && ref[0] !== GROUP_COLUMN[c.group]) {
        report.errors.push(`field "${c.field.id}" in group "${c.group}" must reference column ${GROUP_COLUMN[c.group]}, got ${ref}`)
      }
    }
  }
  report.itemsTotal = valid.size
  report.itemsCovered = covered.size
  for (const ref of valid) {
    if (!covered.has(ref)) {
      const col = ref[0] as SourceColumn
      const idx = Number(ref.slice(1))
      report.errors.push(`source item ${ref} is not covered: "${items[col][idx - 1]}"`)
    }
  }

  // Explicit optional wording («إن وجد / إن وجدت / اختياري») must never become a required field.
  // Column E items bundle several sub-items for a party ("… (السجل التجاري والبطاقة الضريبية إن وجدت)") so the
  // marker only describes part of the item: there, at least one covering field must be optional instead.
  for (const col of ['E', 'F', 'G', 'H'] as const) {
    items[col].forEach((text, i) => {
      if (!OPTIONAL_MARKER.test(text)) return
      const ref = itemRef(col, i + 1)
      report.explicitOptionalItems.push(ref)
      const covering = compiled.filter(c => c.src.includes(ref))
      if (col === 'E') {
        if (covering.length && !covering.some(c => c.req === 'no')) {
          report.errors.push(`${ref} ("${text}") contains optional wording but no field covering it is marked "no" (the optional sub-item)`)
        }
        return
      }
      for (const c of covering) {
        if (c.src.length === 1 && c.req === 'yes') {
          report.errors.push(`field "${c.field.id}" covers ${ref} ("${text}") which is explicitly optional but is marked required`)
        }
      }
    })
  }
  for (const c of compiled) {
    if (new Set(c.src).size !== c.src.length) report.errors.push(`field "${c.field.id}" lists a source reference more than once`)
  }

  // group rules
  for (const c of compiled) {
    if (c.group === 'special' && c.req === 'yes') report.errors.push(`special-condition field "${c.field.id}" is a customer choice and cannot be required`)
    // uploads, plus text/textarea for items that are a link, number or description rather than a file
    if (c.group === 'documents' && !['file', 'text', 'textarea', 'section'].includes(c.field.type)) report.errors.push(`document field "${c.field.id}" must be a file (or text/textarea for a link or reference number)`)
    if (c.group !== 'documents' && c.field.type === 'file') report.errors.push(`file field "${c.field.id}" belongs in "documents"`)
  }

  // the compiled form must satisfy the platform's own schema
  const schemaCheck = formFieldsSchema.safeParse(compiled.map(c => c.field))
  if (!schemaCheck.success) {
    report.errors.push(...schemaCheck.error.issues.map(i => `form schema: ${i.path.join('.')} — ${i.message}`))
  }

  for (const c of compiled) {
    if (c.req === 'section') continue
    report.inputCount++
    if (c.req === 'yes') report.required++
    else if (c.req === 'review') report.review++
    else report.optional++
    if (c.field.type === 'file') {
      report.fileFields++
      if (c.req === 'yes') report.requiredFiles++
    }
    if (c.field.type === 'repeater') report.repeaters++
  }
  return { spec, report, compiled }
}

/** Source text split for display in reports. */
export function describeItems(contract: SourceContract): Record<SourceColumn, string[]> {
  return {
    E: splitItems(contract.partyInfo),
    F: splitItems(contract.technicalFinancial),
    G: splitItems(contract.specialConditions),
    H: splitItems(contract.documents),
  }
}
