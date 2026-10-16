import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildImportPayload, type CategoryDef, type ExistingMapping } from '../../shared/catalog/build'
import { expectedTotalMinor, pricingFor, validatePricing } from '../../shared/catalog/pricing'
import { allItemRefs, parseTurnaround, splitItems, type SourceContract } from '../../shared/catalog/source'
import { validateSpec } from '../../shared/catalog/spec'
import { formFieldsSchema } from '../../shared/domain/formSchema'

const DATA = new URL('../../scripts/catalog-import/data/', import.meta.url)
const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, DATA), 'utf8'))

const contracts = read<SourceContract[]>('source/contracts.source.json')
const categories = read<CategoryDef[]>('categories.json')
const mapping = read<ExistingMapping>('existing-catalog-mapping.json')
const specs = new Map<string, unknown>(
  readdirSync(new URL('specs/', DATA)).filter(f => f.endsWith('.json')).map(f => [f.replace('.json', ''), read<unknown>(`specs/${f}`)]),
)

describe('source workbooks', () => {
  it('contain 32 individuals + 32 companies contracts', () => {
    expect(contracts.filter(c => c.catalog === 'individuals')).toHaveLength(32)
    expect(contracts.filter(c => c.catalog === 'companies')).toHaveLength(32)
    expect(new Set(contracts.map(c => c.ref)).size).toBe(64)
  })

  it('restores the contract number 9 (khul) details missing from the consolidated workbook', () => {
    const c = contracts.find(x => x.ref === 'IND-009')!
    expect(c.nameAr).toBe('عقد اتفاق على الخلع الرضائي والتنازل')
    expect(c.provenance.restoredColumns).toEqual(['C', 'D', 'E', 'F', 'G', 'H', 'I'])
    expect(c.provenance.consolidated.row).toBe(10)
    expect(c.prices).toMatchObject({ original: 2000, launch: 1000, vipLaunch: 500, totalVipLaunch: 1500, totalVipRegular: 3000 })
    // no other contract needed restoring
    expect(contracts.filter(x => x.provenance.restoredColumns.length).map(x => x.ref)).toEqual(['IND-009'])
  })

  it('has the sub-category structure of the brief', () => {
    for (const cat of categories) {
      const n = contracts.filter(c => c.catalog === cat.catalog && c.subcategoryAr === cat.sourceName).length
      expect(n, cat.slug).toBe(cat.expectedCount)
    }
    expect(categories.filter(c => c.catalog === 'individuals')).toHaveLength(8)
    expect(categories.filter(c => c.catalog === 'companies')).toHaveLength(9)
    expect(new Set(categories.map(c => c.slug)).size).toBe(17)
  })

  it('every turnaround parses', () => {
    for (const c of contracts) expect(parseTurnaround(c.turnaround), c.ref).not.toBeNull()
  })

  it('splits items on top-level commas only', () => {
    expect(splitItems('بيانات البائع والمشتري (الاسم رباعي، الرقم القومي، العنوان)')).toEqual(['بيانات البائع والمشتري (الاسم رباعي، الرقم القومي، العنوان)'])
    expect(splitItems('أ، ب، ج')).toEqual(['أ', 'ب', 'ج'])
  })
})

describe('pricing is preserved exactly as supplied', () => {
  it('no source row has an arithmetic error', () => {
    for (const c of contracts) {
      const errors = validatePricing(c).filter(f => f.kind === 'error')
      expect(errors, c.ref).toEqual([])
    }
  })

  it('launch price is exactly 50% of the original in all 64 rows', () => {
    for (const c of contracts) expect(c.prices.launch * 2, c.ref).toBe(c.prices.original)
  })

  it('flags the supplied rounding cases without altering them', () => {
    const rounding = contracts.flatMap(c => validatePricing(c).filter(f => f.kind === 'rounding').map(f => `${c.ref}:${f.code}`))
    expect(rounding.filter(r => r.endsWith('VIP_LAUNCH_ROUNDING'))).toEqual(['IND-027:VIP_LAUNCH_ROUNDING'])
    expect(rounding.filter(r => r.endsWith('BILINGUAL_LAUNCH_ROUNDING'))).toHaveLength(16)
    // 750 EGP original → launch 375 → VIP 187.5 supplied as 187; stored verbatim
    const ind27 = contracts.find(c => c.ref === 'IND-027')!
    expect(pricingFor(ind27).addons[0]).toMatchObject({ launchMinor: 18700, regularMinor: 37500 })
    // company 3500 → launch 1750 → bilingual 962.5 supplied as 962
    const co3 = contracts.find(c => c.ref === 'CO-003')!
    expect(pricingFor(co3).addons.find(a => a.kind === 'bilingual_drafting')!.launchMinor).toBe(96200)
  })

  it('catalog totals reproduce every supplied total', () => {
    for (const c of contracts) {
      const p = c.prices
      expect(expectedTotalMinor(c, { launch: false, vip: false, bilingual: false }), c.ref).toBe(p.original * 100)
      expect(expectedTotalMinor(c, { launch: true, vip: false, bilingual: false }), c.ref).toBe(p.launch * 100)
      expect(expectedTotalMinor(c, { launch: true, vip: true, bilingual: false }), c.ref).toBe(p.totalVipLaunch * 100)
      if (c.catalog === 'individuals') {
        expect(expectedTotalMinor(c, { launch: false, vip: true, bilingual: false }), c.ref).toBe(p.totalVipRegular! * 100)
      }
      else {
        expect(expectedTotalMinor(c, { launch: true, vip: false, bilingual: true }), c.ref).toBe(p.totalBilingualLaunch! * 100)
        expect(expectedTotalMinor(c, { launch: true, vip: true, bilingual: true }), c.ref).toBe(p.totalVipBilingualLaunch! * 100)
        expect(expectedTotalMinor(c, { launch: false, vip: false, bilingual: true }), c.ref).toBe(p.totalBilingualRegular! * 100)
      }
    }
  })

  it('never invents a post-promotion VIP price for companies', () => {
    for (const c of contracts.filter(x => x.catalog === 'companies')) {
      expect(pricingFor(c).addons.find(a => a.kind === 'vip_delivery')!.regularMinor, c.ref).toBeNull()
      expect(expectedTotalMinor(c, { launch: false, vip: true, bilingual: false }), c.ref).toBeNull()
    }
  })

  it('offers bilingual drafting only on company contracts', () => {
    for (const c of contracts) {
      expect(pricingFor(c).addons.some(a => a.kind === 'bilingual_drafting'), c.ref).toBe(c.catalog === 'companies')
    }
  })
})

describe('contract specs (dynamic forms)', () => {
  it('exist and validate for all 64 contracts with every source item covered', () => {
    for (const c of contracts) {
      const { report } = validateSpec(c, specs.get(c.ref))
      expect(report.errors, c.ref).toEqual([])
      expect(report.itemsCovered, c.ref).toBe(allItemRefs(c).length)
    }
  })

  it('compile into forms accepted by the platform schema, within the 60-field limit', () => {
    for (const c of contracts) {
      const { compiled } = validateSpec(c, specs.get(c.ref))
      expect(formFieldsSchema.safeParse(compiled.map(x => x.field)).success, c.ref).toBe(true)
      expect(compiled.length, c.ref).toBeLessThanOrEqual(60)
    }
  })

  it('never makes a column-G customer choice mandatory and keeps explicit-optional documents optional', () => {
    for (const c of contracts) {
      const { compiled } = validateSpec(c, specs.get(c.ref))
      for (const f of compiled.filter(x => x.group === 'special')) expect(f.field.required, `${c.ref}/${f.field.id}`).toBeFalsy()
    }
  })

  it('every contract has an English title/description and a unique slug', () => {
    const slugs = new Set<string>()
    for (const c of contracts) {
      const { spec } = validateSpec(c, specs.get(c.ref))
      expect(spec!.en.title.length, c.ref).toBeGreaterThan(3)
      expect(spec!.en.description.length, c.ref).toBeGreaterThan(10)
      expect(slugs.has(spec!.slug), spec!.slug).toBe(false)
      slugs.add(spec!.slug)
    }
  })
})

describe('import payload', () => {
  const { payload, problems } = buildImportPayload({ contracts, specs, categories, mapping })

  it('builds without problems', () => {
    expect(problems).toEqual([])
  })

  it('contains 64 services in 17 sub-categories with the expected counts', () => {
    expect(payload.services).toHaveLength(64)
    expect(payload.categories).toHaveLength(17)
    for (const cat of categories) expect(payload.services.filter(s => s.categorySlug === cat.slug), cat.slug).toHaveLength(cat.expectedCount)
  })

  it('reuses exactly the three mapped existing services and keeps their slugs', () => {
    const reused = payload.services.filter(s => s.reuseSlug)
    expect(reused.map(s => `${s.ref}→${s.slug}`).sort()).toEqual(['CO-006→employment-contract', 'CO-011→company-governance', 'IND-004→lease-agreement'])
  })

  it('every service is launch-eligible with an explicit launch price and consistent stable ids', () => {
    for (const s of payload.services) {
      expect(s.launchEligible, s.ref).toBe(true)
      expect(s.launchPriceMinor * 2, s.ref).toBe(s.basePriceMinor)
      expect(s.sourceRef, s.ref).toBe(`catalog-2026-10:${s.ref}`)
    }
    expect(new Set(payload.services.map(s => s.slug)).size).toBe(64)
  })

  it('is deterministic', () => {
    const again = buildImportPayload({ contracts, specs, categories, mapping })
    expect(JSON.stringify(again.payload)).toBe(JSON.stringify(payload))
  })
})
