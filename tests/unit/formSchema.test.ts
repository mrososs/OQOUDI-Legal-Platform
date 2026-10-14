import { describe, expect, it } from 'vitest'
import { describeAnswers, formFieldsSchema, validateAnswers, type FormField } from '#shared/domain/formSchema'

const fields: FormField[] = formFieldsSchema.parse([
  { id: 'heading', type: 'section', label: { ar: 'بيانات' } },
  { id: 'name', type: 'text', label: { ar: 'الاسم', en: 'Name' }, required: true, maxLength: 20 },
  { id: 'desc', type: 'textarea', label: { ar: 'الوصف' }, required: true, minLength: 10 },
  { id: 'count', type: 'number', label: { ar: 'العدد' }, min: 1, max: 5 },
  { id: 'start', type: 'date', label: { ar: 'التاريخ' } },
  { id: 'kind', type: 'select', label: { ar: 'النوع' }, required: true, options: [{ value: 'a', label: { ar: 'أ' } }, { value: 'b', label: { ar: 'ب', en: 'B' } }] },
  { id: 'extras', type: 'checkbox', label: { ar: 'إضافات' }, options: [{ value: 'x', label: { ar: 'س' } }, { value: 'y', label: { ar: 'ص' } }] },
  { id: 'files', type: 'file', label: { ar: 'ملفات' }, required: true, accept: ['pdf'], maxFiles: 2 },
])

const docId = '11111111-1111-4111-8111-111111111111'

describe('formFieldsSchema', () => {
  it('rejects duplicate field ids', () => {
    const r = formFieldsSchema.safeParse([
      { id: 'a', type: 'text', label: { ar: 'أ' } },
      { id: 'a', type: 'text', label: { ar: 'ب' } },
    ])
    expect(r.success).toBe(false)
  })

  it('requires options for choice fields', () => {
    expect(formFieldsSchema.safeParse([{ id: 'c', type: 'select', label: { ar: 'اختيار' } }]).success).toBe(false)
  })

  it('rejects a form with only display fields', () => {
    expect(formFieldsSchema.safeParse([{ id: 'h', type: 'section', label: { ar: 'عنوان' } }]).success).toBe(false)
  })

  it('rejects required display fields and unknown file extensions', () => {
    expect(formFieldsSchema.safeParse([{ id: 'h', type: 'help', label: { ar: 'م' }, required: true }, { id: 't', type: 'text', label: { ar: 'ن' } }]).success).toBe(false)
    expect(formFieldsSchema.safeParse([{ id: 'f', type: 'file', label: { ar: 'م' }, accept: ['exe'] }]).success).toBe(false)
  })
})

describe('validateAnswers', () => {
  it('accepts a valid submission and normalizes values', () => {
    const r = validateAnswers(fields, {
      name: '  أحمد  ',
      desc: 'وصف طويل بما يكفي',
      count: '3',
      start: '2026-10-20',
      kind: 'b',
      extras: ['x'],
      files: [docId],
    })
    expect(r.ok).toBe(true)
    expect(r.normalized).toEqual({ name: 'أحمد', desc: 'وصف طويل بما يكفي', count: 3, start: '2026-10-20', kind: 'b', extras: ['x'], files: [docId] })
    expect(r.documentIdsByField).toEqual({ files: [docId] })
  })

  it('reports required, length, range, option and file errors', () => {
    const r = validateAnswers(fields, {
      name: '',
      desc: 'قصير',
      count: 9,
      start: '2026-13-45',
      kind: 'zzz',
      extras: ['x', 'nope'],
      files: [docId, docId, docId],
    })
    expect(r.ok).toBe(false)
    expect(r.errors.name?.code).toBe('required')
    expect(r.errors.desc).toEqual({ code: 'minLength', params: { min: 10 } })
    expect(r.errors.count).toEqual({ code: 'max', params: { max: 5 } })
    expect(r.errors.start?.code).toBe('invalidDate')
    expect(r.errors.kind?.code).toBe('invalidOption')
    expect(r.errors.extras?.code).toBe('invalidOption')
    expect(r.errors.files).toEqual({ code: 'tooManyFiles', params: { max: 2 } })
  })

  it('uses specific required codes for choices and files', () => {
    const r = validateAnswers(fields, { name: 'x', desc: '1234567890' })
    expect(r.errors.kind?.code).toBe('requiredChoice')
    expect(r.errors.files?.code).toBe('requiredFile')
  })

  it('drops unknown keys and rejects non-uuid file values', () => {
    const r = validateAnswers(fields, { name: 'x', desc: '1234567890', kind: 'a', files: ['../etc/passwd'], hacked: 'yes' } as never)
    expect(r.errors.files?.code).toBe('invalidValue')
    expect('hacked' in r.normalized).toBe(false)
  })

  it('treats whitespace-only text as empty for required fields', () => {
    const r = validateAnswers(fields, { name: '   ', desc: '1234567890', kind: 'a', files: [docId] })
    expect(r.errors.name?.code).toBe('required')
  })
})

describe('describeAnswers', () => {
  it('resolves option labels in the requested language', () => {
    const rows = describeAnswers(fields, { name: 'Ahmed', kind: 'b', extras: ['x', 'y'] }, 'en', v => (v?.en || v?.ar || ''), d => d)
    expect(rows.find(r => r.fieldId === 'kind')?.value).toBe('B')
    expect(rows.find(r => r.fieldId === 'extras')?.value).toBe('س, ص')
    expect(rows.find(r => r.fieldId === 'name')?.label).toBe('Name')
  })
})
