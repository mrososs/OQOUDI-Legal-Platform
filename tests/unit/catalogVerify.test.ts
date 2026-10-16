import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildImportPayload, type CategoryDef, type ExistingMapping, type ImportService } from '../../shared/catalog/build'
import type { SourceContract } from '../../shared/catalog/source'
import { CHECKS, verifyCatalog, type CheckName, type DbService } from '../../shared/catalog/verify'

const DATA = new URL('../../scripts/catalog-import/data/', import.meta.url)
const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, DATA), 'utf8'))
const contracts = read<SourceContract[]>('source/contracts.source.json')
const categories = read<CategoryDef[]>('categories.json')
const mapping = read<ExistingMapping>('existing-catalog-mapping.json')
const specs = new Map<string, unknown>(readdirSync(new URL('specs/', DATA)).filter(f => f.endsWith('.json')).map(f => [f.replace('.json', ''), read<unknown>(`specs/${f}`)]))
const { payload } = buildImportPayload({ contracts, specs, categories, mapping })

/** What the database holds after a correct import, built from the payload. */
function dbFrom(s: ImportService): DbService {
  const cat = categories.find(c => c.slug === s.categorySlug)!
  return {
    id: `id-${s.ref}`,
    slug: s.slug,
    source_ref: s.sourceRef,
    status: 'published',
    title: s.title,
    short_description: s.shortDescription,
    delivery_estimate: s.deliveryEstimate,
    base_price_minor: s.basePriceMinor,
    launch_price_minor: s.launchPriceMinor,
    launch_eligible: true,
    translation_status: 'pending_review',
    category_slug: s.categorySlug,
    parent_slug: cat.parentSlug,
    published_form_version_id: `form-${s.ref}`,
    published_form: { id: `form-${s.ref}`, status: 'published', fields: structuredClone(s.fields) },
    addons: s.addons.map(a => ({ kind: a.kind, price_minor: a.priceMinor, launch_price_minor: a.launchPriceMinor, is_active: true, title: a.title })),
    section_keys: s.sections.map(x => x.key),
  }
}
const run = (services: DbService[]) => verifyCatalog({ contracts, specs, categories, services })
const baseline = () => payload.services.map(dbFrom)

describe('catalog verification', () => {
  it('passes all 64 contracts for a correct import', () => {
    const rows = run(baseline())
    expect(rows).toHaveLength(64)
    expect(rows.filter(r => !r.ok).map(r => r.ref)).toEqual([])
  })

  const mutations: [CheckName, string, (s: DbService) => void][] = [
    ['name', 'a different name', (s) => { s.title = { ar: 'اسم مختلف' } }],
    ['original_price', 'a different original price', (s) => { s.base_price_minor += 100 }],
    ['launch_price', 'a different launch price', (s) => { s.launch_price_minor = (s.launch_price_minor ?? 0) + 100 }],
    ['launch_price', 'not launch-eligible', (s) => { s.launch_eligible = false }],
    ['addons', 'a changed VIP launch fee', (s) => { s.addons.find(a => a.kind === 'vip_delivery')!.launch_price_minor! += 100 }],
    ['addons', 'a missing VIP add-on', (s) => { s.addons = s.addons.filter(a => a.kind !== 'vip_delivery') }],
    ['addons', 'an invented company VIP regular price', (s) => { s.addons.find(a => a.kind === 'vip_delivery')!.price_minor = 12345 }],
    ['duration', 'a different turnaround', (s) => { s.delivery_estimate = { ar: '9 أيام عمل' } }],
    ['description', 'a different description', (s) => { s.short_description = { ar: 'وصف عام' } }],
    ['subcategory', 'the wrong sub-category', (s) => { s.category_slug = categories.find(c => c.slug !== s.category_slug)!.slug }],
    ['top_category', 'the wrong top-level category', (s) => { s.parent_slug = s.parent_slug === 'individuals' ? 'companies' : 'individuals' }],
    ['form_fields', 'a dropped form field', (s) => { (s.published_form!.fields as unknown[]).pop() }],
    ['form_sections', 'a missing step section', (s) => { s.published_form!.fields = (s.published_form!.fields as { type: string }[]).filter(f => f.type !== 'section') }],
    ['documents', 'a document marked optional', (s) => {
      const f = (s.published_form!.fields as { type: string, required?: boolean }[]).find(x => x.type === 'file' && x.required)
      if (f) delete f.required
      else (s.published_form!.fields as { type: string }[]).push({ type: 'file' })
    }],
    ['published_form', 'an unpublished service', (s) => { s.status = 'draft' }],
  ]

  for (const [check, label, mutate] of mutations) {
    it(`fails "${check}" for ${label}`, () => {
      const target = label.includes('company') ? 'CO-003' : 'IND-006'
      const services = baseline()
      mutate(services.find(s => s.source_ref?.endsWith(target))!)
      const row = run(services).find(r => r.ref === target)!
      expect(row.results[check].ok, `${check} on ${target}`).toBe(false)
      expect(row.ok).toBe(false)
      // every other contract is unaffected
      expect(run(services).filter(r => r.ref !== target).every(r => r.ok)).toBe(true)
    })
  }

  it('fails "one_record" for a duplicate or missing record', () => {
    const dup = baseline()
    dup.push({ ...dup[0]!, id: 'dup' })
    expect(run(dup)[0]!.results.one_record.ok).toBe(false)
    expect(run(baseline().slice(1))[0]!.ok).toBe(false)
  })

  it('checks every dimension the brief lists', () => {
    expect([...CHECKS]).toEqual(expect.arrayContaining(['one_record', 'top_category', 'subcategory', 'name', 'original_price', 'launch_price', 'addons', 'duration', 'description', 'form_sections', 'form_fields', 'documents', 'published_form']))
  })
})
