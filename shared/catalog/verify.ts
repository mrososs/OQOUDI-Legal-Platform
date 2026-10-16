/**
 * Source → database verification for every catalog contract.
 * Pure: takes the rows read from the database; used by scripts/catalog-import/verify.ts
 * (writes the coverage matrix) and by tests/integration/catalog-import.test.ts.
 */
import type { CategoryDef } from './build'
import { sourceRefFor } from './build'
import { pricingFor } from './pricing'
import { compileSpec, validateSpec } from './spec'
import { allItemRefs, type SourceContract } from './source'

export interface DbAddon { kind: string | null, price_minor: number | null, launch_price_minor: number | null, is_active: boolean, title: { ar: string, en?: string | null } }
export interface DbService {
  id: string
  slug: string
  source_ref: string | null
  status: string
  title: { ar: string, en?: string | null }
  short_description: { ar: string, en?: string | null }
  delivery_estimate: { ar: string, en?: string | null }
  base_price_minor: number
  launch_price_minor: number | null
  launch_eligible: boolean
  translation_status: string
  category_slug: string
  parent_slug: string | null
  published_form: { id: string, status: string, fields: unknown } | null
  published_form_version_id: string | null
  addons: DbAddon[]
  section_keys: string[]
}

export const CHECKS = [
  'one_record', 'top_category', 'subcategory', 'name', 'original_price', 'launch_price', 'addons',
  'duration', 'description', 'form_sections', 'form_fields', 'documents', 'published_form',
] as const
export type CheckName = (typeof CHECKS)[number]

export interface ContractVerification {
  ref: string
  slug: string | null
  nameAr: string
  results: Record<CheckName, { ok: boolean, detail?: string }>
  ok: boolean
}

export function verifyCatalog(input: {
  contracts: SourceContract[]
  specs: Map<string, unknown>
  categories: CategoryDef[]
  services: DbService[]
}): ContractVerification[] {
  const { contracts, specs, categories, services } = input
  return contracts.map((c) => {
    const results = {} as ContractVerification['results']
    const set = (k: CheckName, ok: boolean, detail?: string) => { results[k] = { ok, detail: ok ? undefined : detail } }
    const matches = services.filter(s => s.source_ref === sourceRefFor(c.ref))
    const s = matches[0]
    set('one_record', matches.length === 1, `${matches.length} records with source_ref ${sourceRefFor(c.ref)}`)

    const cat = categories.find(x => x.catalog === c.catalog && x.sourceName === c.subcategoryAr)
    const spec = validateSpec(c, specs.get(c.ref))
    const compiled = spec.spec ? compileSpec(spec.spec).map(x => x.field) : []
    const pr = pricingFor(c)

    if (!s) {
      for (const k of CHECKS) if (!results[k]) set(k, false, 'service record missing')
      return { ref: c.ref, slug: null, nameAr: c.nameAr, results, ok: false }
    }

    set('top_category', s.parent_slug === c.catalog, `parent ${s.parent_slug} ≠ ${c.catalog}`)
    set('subcategory', !!cat && s.category_slug === cat.slug, `category ${s.category_slug} ≠ ${cat?.slug}`)
    set('name', s.title.ar === c.nameAr, `title "${s.title.ar}"`)
    set('original_price', s.base_price_minor === pr.baseMinor, `${s.base_price_minor} ≠ ${pr.baseMinor}`)
    set('launch_price', s.launch_price_minor === pr.launchMinor && s.launch_eligible, `launch ${s.launch_price_minor}/${s.launch_eligible} ≠ ${pr.launchMinor}/true`)

    const active = s.addons.filter(a => a.is_active && a.kind)
    const addonProblems: string[] = []
    for (const kind of ['vip_delivery', 'bilingual_drafting'] as const) {
      const want = pr.addons.find(a => a.kind === kind)
      const have = active.filter(a => a.kind === kind)
      if (!want) { if (have.length) addonProblems.push(`${kind} must not exist`); continue }
      if (have.length !== 1) { addonProblems.push(`${kind}: ${have.length} active`); continue }
      if (have[0]!.launch_price_minor !== want.launchMinor) addonProblems.push(`${kind} launch ${have[0]!.launch_price_minor} ≠ ${want.launchMinor}`)
      if (have[0]!.price_minor !== want.regularMinor) addonProblems.push(`${kind} regular ${have[0]!.price_minor} ≠ ${want.regularMinor}`)
    }
    set('addons', addonProblems.length === 0, addonProblems.join('; '))

    set('duration', s.delivery_estimate.ar === c.turnaround, `"${s.delivery_estimate.ar}" ≠ "${c.turnaround}"`)
    set('description', s.short_description.ar === c.descriptionAr, 'description differs from the source')

    const form = s.published_form
    const fields = (form?.fields ?? []) as { id: string, type: string, required?: boolean }[]
    const dbSections = fields.filter(f => f.type === 'section').map(f => f.id)
    const wantSections = compiled.filter(f => f.type === 'section').map(f => f.id)
    set('form_sections', JSON.stringify(dbSections) === JSON.stringify(wantSections), `sections [${dbSections}] ≠ [${wantSections}]`)

    const sameFields = JSON.stringify(sortKeys(fields)) === JSON.stringify(sortKeys(compiled))
    const coverage = spec.report.itemsCovered === allItemRefs(c).length && spec.report.errors.length === 0
    set('form_fields', sameFields && coverage, !sameFields ? 'published form differs from the compiled spec' : `source coverage ${spec.report.itemsCovered}/${allItemRefs(c).length}`)

    const dbDocs = fields.filter(f => f.type === 'file').map(f => `${f.id}:${f.required ? 1 : 0}`).sort()
    const wantDocs = compiled.filter(f => f.type === 'file').map(f => `${f.id}:${f.required ? 1 : 0}`).sort()
    set('documents', JSON.stringify(dbDocs) === JSON.stringify(wantDocs), `documents [${dbDocs}] ≠ [${wantDocs}]`)

    set('published_form', s.status === 'published' && !!form && form.status === 'published' && form.id === s.published_form_version_id,
      `status ${s.status}, form ${form?.status ?? 'none'}`)

    return { ref: c.ref, slug: s.slug, nameAr: c.nameAr, results, ok: CHECKS.every(k => results[k]?.ok) }
  })
}

/** Deep key-sorted copy so comparison ignores object key order (jsonb does not preserve it). */
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sortKeys(x)]))
  }
  return v
}
