/**
 * Source rows + specs + categories + existing-catalog mapping → the payload consumed by
 * `private.catalog_import(payload)`. Pure and deterministic: the same inputs always produce
 * byte-identical output (the generated data migration is therefore reviewable and repeatable).
 */
import { pricingFor } from './pricing'
import { compileSpec, validateSpec } from './spec'
import { parseTurnaround, turnaroundEn, type SourceContract } from './source'

export const BATCH_KEY = 'catalog-2026-10'
export const sourceRefFor = (ref: string) => `${BATCH_KEY}:${ref}`

export interface CategoryDef {
  slug: string
  parentSlug: string
  catalog: 'individuals' | 'companies'
  sourceName: string
  icon: string
  sortOrder: number
  expectedCount: number
  title: { ar: string, en: string }
  description: { ar: string, en: string }
}

export interface ExistingMapping {
  services: { slug: string, decision: 'reuse' | 'retain', contractRef?: string }[]
}

type Localized = { ar: string, en: string }

export interface ImportService {
  ref: string
  sourceRef: string
  slug: string
  reuseSlug: string | null
  categorySlug: string
  title: Localized
  shortDescription: Localized
  deliveryEstimate: Localized
  basePriceMinor: number
  launchPriceMinor: number
  launchEligible: true
  sortOrder: number
  translationStatus: 'pending_review'
  publish: boolean
  addons: { kind: string, title: Localized, priceMinor: number | null, launchPriceMinor: number, sortOrder: number }[]
  sections: { key: string, isEnabled: boolean, sortOrder: number, content: null }[]
  fields: unknown[]
}

export interface ImportPayload {
  batchKey: string
  categories: {
    slug: string, parentSlug: string, title: Localized, description: Localized, icon: string, sortOrder: number
  }[]
  services: ImportService[]
}

export interface BuildResult {
  payload: ImportPayload
  problems: string[]
}

export function buildImportPayload(input: {
  contracts: SourceContract[]
  specs: Map<string, unknown>
  categories: CategoryDef[]
  mapping: ExistingMapping
  /** false = import as drafts (not visible to customers until an admin publishes). Default: published. */
  publish?: boolean
}): BuildResult {
  const problems: string[] = []
  const { contracts, specs, categories, mapping } = input

  if (contracts.length !== 64) problems.push(`expected 64 contracts, found ${contracts.length}`)

  const categoryFor = (c: SourceContract) =>
    categories.find(cat => cat.catalog === c.catalog && cat.sourceName === c.subcategoryAr)

  // category counts must match the client's structure exactly
  for (const cat of categories) {
    const n = contracts.filter(c => categoryFor(c)?.slug === cat.slug).length
    if (n !== cat.expectedCount) problems.push(`category ${cat.slug}: expected ${cat.expectedCount} contracts, found ${n}`)
  }

  const reuseByRef = new Map(mapping.services.filter(s => s.decision === 'reuse' && s.contractRef).map(s => [s.contractRef!, s.slug]))
  for (const ref of reuseByRef.keys()) {
    if (!contracts.some(c => c.ref === ref)) problems.push(`mapping references unknown contract ${ref}`)
  }

  const services: ImportService[] = []
  const slugs = new Map<string, string>()
  for (const c of contracts) {
    const cat = categoryFor(c)
    if (!cat) { problems.push(`${c.ref}: no category for sub-category "${c.subcategoryAr}"`); continue }
    const { spec, report, compiled } = validateSpec(c, specs.get(c.ref))
    if (!spec) { problems.push(`${c.ref}: ${report.errors.join('; ') || 'spec missing'}`); continue }
    for (const e of report.errors) problems.push(`${c.ref}: ${e}`)

    const turnaround = parseTurnaround(c.turnaround)
    if (!turnaround) problems.push(`${c.ref}: cannot parse turnaround "${c.turnaround}"`)

    const reuseSlug = reuseByRef.get(c.ref) ?? null
    const slug = reuseSlug ?? spec.slug
    const clash = slugs.get(slug)
    if (clash) problems.push(`${c.ref}: slug "${slug}" already used by ${clash}`)
    slugs.set(slug, c.ref)

    const pr = pricingFor(c)
    services.push({
      ref: c.ref,
      sourceRef: sourceRefFor(c.ref),
      slug,
      reuseSlug,
      categorySlug: cat.slug,
      title: { ar: c.nameAr, en: spec.en.title },
      shortDescription: { ar: c.descriptionAr, en: spec.en.description },
      deliveryEstimate: { ar: c.turnaround, en: turnaround ? turnaroundEn(turnaround) : c.turnaround },
      basePriceMinor: pr.baseMinor,
      launchPriceMinor: pr.launchMinor,
      launchEligible: true,
      sortOrder: (c.catalog === 'individuals' ? 100 : 200) + c.number,
      translationStatus: 'pending_review',
      publish: input.publish ?? true,
      addons: pr.addons.map((a, i) => ({
        kind: a.kind, title: { ar: a.title.ar, en: a.title.en }, priceMinor: a.regularMinor, launchPriceMinor: a.launchMinor, sortOrder: i + 1,
      })),
      sections: [
        { key: 'duration', isEnabled: true, sortOrder: 1, content: null },
        { key: 'pricing', isEnabled: true, sortOrder: 2, content: null },
        { key: 'reviews', isEnabled: true, sortOrder: 3, content: null },
      ],
      fields: compiled.map(x => x.field),
    })
  }

  const usedCategories = categories.map(cat => ({
    slug: cat.slug,
    parentSlug: cat.parentSlug,
    title: cat.title,
    description: cat.description,
    icon: cat.icon,
    sortOrder: cat.sortOrder,
  }))

  return { payload: { batchKey: BATCH_KEY, categories: usedCategories, services }, problems }
}

/** Re-exported so scripts and tests share one compile path. */
export { compileSpec }
