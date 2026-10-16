import { describe, expect, it } from 'vitest'
import { describeAnswers, formFieldSchema, formFieldsSchema, validateAnswers, validateField, type FormField } from '#shared/domain/formSchema'

const children: FormField = {
  id: 'children',
  type: 'repeater',
  label: { ar: 'أسماء الأبناء وأعمارهم', en: 'Children' },
  required: true,
  maxItems: 3,
  columns: [
    { id: 'name', type: 'text', label: { ar: 'الاسم', en: 'Name' }, required: true },
    { id: 'age', type: 'number', label: { ar: 'العمر', en: 'Age' }, min: 0, max: 30 },
    { id: 'gender', type: 'select', label: { ar: 'النوع', en: 'Gender' }, options: [{ value: 'm', label: { ar: 'ذكر', en: 'Male' } }, { value: 'f', label: { ar: 'أنثى', en: 'Female' } }] },
  ],
}

describe('repeater field schema', () => {
  it('accepts a well-formed repeater and rejects structural mistakes', () => {
    expect(formFieldSchema.safeParse(children).success).toBe(true)
    expect(formFieldSchema.safeParse({ ...children, columns: undefined }).success).toBe(false)
    expect(formFieldSchema.safeParse({ ...children, columns: [children.columns![0], children.columns![0]] }).success).toBe(false)
    expect(formFieldSchema.safeParse({ ...children, minItems: 5, maxItems: 2 }).success).toBe(false)
    expect(formFieldSchema.safeParse({ id: 'x', type: 'text', label: { ar: 'س' }, columns: children.columns }).success).toBe(false)
    expect(formFieldSchema.safeParse({ ...children, columns: [{ id: 'k', type: 'select', label: { ar: 'س' } }] }).success).toBe(false)
  })

  it('flags legalReview + required as contradictory (a field is either enforced or pending review)', () => {
    const base = { id: 'a', type: 'text', label: { ar: 'س' } }
    expect(formFieldSchema.safeParse({ ...base, legalReview: true }).success).toBe(true)
    expect(formFieldSchema.safeParse({ ...base, legalReview: true, required: true }).success).toBe(false)
  })

  it('works inside a form that has only repeater inputs', () => {
    expect(formFieldsSchema.safeParse([children]).success).toBe(true)
  })
})

describe('repeater answers', () => {
  it('requires at least one non-blank row when required and ignores blank rows', () => {
    expect(validateField(children, [])?.code).toBe('requiredRows')
    expect(validateField(children, [{}, { name: '  ' }])?.code).toBe('requiredRows')
    expect(validateField({ ...children, required: false }, [{}])).toBeNull()
  })

  it('validates each filled row (required cell, number range, option, length)', () => {
    expect(validateField(children, [{ age: 5 }])).toEqual({ code: 'rowRequired', params: { row: 1, column: 'name' } })
    expect(validateField(children, [{ name: 'ليلى', age: 5 }, { name: 'عمر', age: 99 }])).toEqual({ code: 'rowInvalid', params: { row: 2, column: 'age' } })
    expect(validateField(children, [{ name: 'ليلى', gender: 'x' }])).toEqual({ code: 'rowInvalid', params: { row: 1, column: 'gender' } })
    expect(validateField(children, [{ name: 'ليلى', age: '7', gender: 'f' }])).toBeNull()
  })

  it('enforces row limits', () => {
    const four = Array.from({ length: 4 }, (_, i) => ({ name: `ابن ${i}` }))
    expect(validateField(children, four)?.code).toBe('maxItems')
    expect(validateField({ ...children, minItems: 2 }, [{ name: 'ليلى' }])).toEqual({ code: 'minItems', params: { min: 2 } })
  })

  it('rejects malformed values', () => {
    expect(validateField(children, 'text')?.code).toBe('invalidValue')
    expect(validateField(children, ['a', 'b'] as never)?.code).toBe('invalidValue')
  })

  it('normalizes rows: drops blank rows and unknown keys, trims text and coerces numbers', () => {
    const res = validateAnswers([children], { children: [{ name: '  ليلى ', age: '7', evil: 'x' }, {}, { name: ' ' }] as never })
    expect(res.ok).toBe(true)
    expect(res.normalized.children).toEqual([{ name: 'ليلى', age: 7 }])
  })

  it('describes rows one per line for review screens and lawyers', () => {
    const rows = describeAnswers([children], { children: [{ name: 'ليلى', age: 7, gender: 'f' }, { name: 'عمر' }] }, 'en', v => v?.en ?? v?.ar ?? '', ymd => ymd)
    expect(rows[0]!.value).toBe('1) Name: ليلى | Age: 7 | Gender: Female\n2) Name: عمر')
  })
})
