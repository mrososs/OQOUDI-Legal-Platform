import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { DISPLAY_ONLY_TYPES, formFieldsSchema, type FormField, type RepeaterColumn } from '../../shared/domain/formSchema'
import type { SourceContract } from '../../shared/catalog/source'
import { newCustomer, service, sql, uploadPdf, type Session } from './helpers'

/**
 * Every catalog contract through the REAL API: the server validates the exact published form
 * version. Needs the dev server (npm run dev) and the local Supabase stack.
 */
const DATA = new URL('../../scripts/catalog-import/data/', import.meta.url)
const contracts: SourceContract[] = JSON.parse(readFileSync(new URL('source/contracts.source.json', DATA), 'utf8'))

function valueForColumn(c: RepeaterColumn, row: number): string | number {
  switch (c.type) {
    case 'number': return Math.min(c.max ?? 1000, Math.max(c.min ?? 0, 5)) + row
    case 'date': return '2026-12-01'
    case 'select': return c.options![0]!.value
    default: return `قيمة ${row + 1}`
  }
}

/** Valid answers for the given fields; `onlyRequired` leaves optional inputs empty. */
async function answersFor(session: Session, fields: FormField[], formVersionId: string, onlyRequired: boolean): Promise<Record<string, unknown>> {
  const answers: Record<string, unknown> = {}
  for (const f of fields) {
    if (DISPLAY_ONLY_TYPES.includes(f.type)) continue
    if (onlyRequired && !f.required) continue
    switch (f.type) {
      case 'text': answers[f.id] = 'نص تجريبي'; break
      case 'textarea': answers[f.id] = 'وصف تجريبي للاختبار'; break
      case 'number': answers[f.id] = Math.min(f.max ?? 1_000_000, Math.max(f.min ?? 0, 10)); break
      case 'date': answers[f.id] = '2026-12-01'; break
      case 'select':
      case 'radio': answers[f.id] = f.options![0]!.value; break
      case 'checkbox':
      case 'multiselect': answers[f.id] = [f.options![0]!.value]; break
      case 'repeater': {
        const rows = Math.max(f.minItems ?? 1, 1)
        answers[f.id] = Array.from({ length: rows }, (_, r) => Object.fromEntries((f.columns ?? []).map(c => [c.id, valueForColumn(c, r)])))
        break
      }
      case 'file': answers[f.id] = [await uploadPdf(session, { purpose: 'form', formVersionId, fieldId: f.id }, `${f.id}.pdf`)]; break
    }
  }
  return answers
}

let customer: Session
beforeAll(async () => {
  customer = await newCustomer('catalog-orders')
})

describe('every contract accepts exactly its own requirements', () => {
  it.each(contracts.map(c => [c.ref, c.nameAr] as const))('%s — %s', async (ref) => {
    const c = contracts.find(x => x.ref === ref)!
    const [svc] = await sql<{ id: string, slug: string, published_form_version_id: string, base_price_minor: string }>(
      `select id, slug, published_form_version_id, base_price_minor from public.services where source_ref = $1`, [`catalog-2026-10:${ref}`])
    const { data: version } = await service.from('service_form_versions').select('fields').eq('id', svc!.published_form_version_id).single()
    const fields = formFieldsSchema.parse(version!.fields)
    const requiredIds = fields.filter(f => !DISPLAY_ONLY_TYPES.includes(f.type) && f.required).map(f => f.id).sort()
    expect(requiredIds.length, 'every contract has at least one mandatory field').toBeGreaterThan(0)

    // 1) empty submission: rejected, and the rejected fields are exactly the required ones
    const empty = await customer.api<{ data?: { fieldErrors?: Record<string, unknown> } }>('/api/orders', {
      method: 'POST',
      body: { serviceId: svc!.id, formVersionId: svc!.published_form_version_id, answers: {}, addonIds: [] },
    })
    expect(empty.status).toBe(422)
    expect(Object.keys(empty.data.data?.fieldErrors ?? {}).sort()).toEqual(requiredIds)

    // 2) required-only answers + real uploads: accepted, priced from the catalog, answers stored
    const answers = await answersFor(customer, fields, svc!.published_form_version_id, true)
    const created = await customer.api<{ id: string, orderNumber: string, status: string, totalMinor: number }>('/api/orders', {
      method: 'POST',
      body: { serviceId: svc!.id, formVersionId: svc!.published_form_version_id, answers, addonIds: [], totalMinor: 1, basePriceMinor: 1 },
    })
    expect(created.status, JSON.stringify(created.data)).toBe(200)
    expect(created.data.status).toBe('awaiting_payment')
    // client-supplied prices are ignored: the charged amount is the catalog's regular price (campaign is off)
    expect(created.data.totalMinor).toBe(c.prices.original * 100)
    const [order] = await sql<{ form_answers: Record<string, unknown>, form_version_id: string, total_minor: string }>(
      'select form_answers, form_version_id, total_minor from public.orders where id = $1', [created.data.id])
    expect(order!.form_version_id).toBe(svc!.published_form_version_id)
    expect(Number(order!.total_minor)).toBe(c.prices.original * 100)
    expect(Object.keys(order!.form_answers).sort()).toEqual(requiredIds)
  })
})

describe('optional and structured inputs', () => {
  it('stores repeater rows and optional answers, and drops unknown keys', async () => {
    const [svc] = await sql<{ id: string, published_form_version_id: string }>(`select id, published_form_version_id from public.services where slug = 'residential-apartment-sale-contract' or source_ref = 'catalog-2026-10:IND-001' limit 1`)
    const { data: version } = await service.from('service_form_versions').select('fields').eq('id', svc!.published_form_version_id).single()
    const fields = formFieldsSchema.parse(version!.fields)
    const answers = await answersFor(customer, fields, svc!.published_form_version_id, false)
    const res = await customer.api<{ id: string }>('/api/orders', {
      method: 'POST',
      body: { serviceId: svc!.id, formVersionId: svc!.published_form_version_id, answers: { ...answers, not_a_field: 'x' }, addonIds: [] },
    })
    expect(res.status, JSON.stringify(res.data)).toBe(200)
    const [order] = await sql<{ form_answers: Record<string, unknown> }>('select form_answers from public.orders where id = $1', [res.data.id])
    expect(order!.form_answers).not.toHaveProperty('not_a_field')
    expect(Array.isArray(order!.form_answers.installments)).toBe(true)
    expect(order!.form_answers.installments).toEqual([{ due_date: '2026-12-01', amount: 5 }])
  })

  it('rejects a malformed repeater and an unknown select option', async () => {
    const [svc] = await sql<{ id: string, published_form_version_id: string }>(`select id, published_form_version_id from public.services where source_ref = 'catalog-2026-10:IND-001'`)
    const { data: version } = await service.from('service_form_versions').select('fields').eq('id', svc!.published_form_version_id).single()
    const fields = formFieldsSchema.parse(version!.fields)
    const answers = await answersFor(customer, fields, svc!.published_form_version_id, true)
    const bad = await customer.api<{ data?: { fieldErrors?: Record<string, { code: string }> } }>('/api/orders', {
      method: 'POST',
      body: { serviceId: svc!.id, formVersionId: svc!.published_form_version_id, answers: { ...answers, installments: [{ due_date: 'soon', amount: 'lots' }] }, addonIds: [] },
    })
    expect(bad.status).toBe(422)
    expect(bad.data.data?.fieldErrors?.installments?.code).toBe('rowInvalid')
  })
})
