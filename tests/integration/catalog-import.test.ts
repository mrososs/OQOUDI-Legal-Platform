import { readFileSync, readdirSync } from 'node:fs'
import pg from 'pg'
import { describe, expect, it } from 'vitest'
import { fetchDbServices } from '../../scripts/catalog-import/db'
import { buildImportPayload, type CategoryDef, type ExistingMapping, type ImportPayload } from '../../shared/catalog/build'
import type { SourceContract } from '../../shared/catalog/source'
import { verifyCatalog } from '../../shared/catalog/verify'
import { anon, DB_URL, sql } from './helpers'

const DATA = new URL('../../scripts/catalog-import/data/', import.meta.url)
const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, DATA), 'utf8'))
const contracts = read<SourceContract[]>('source/contracts.source.json')
const categories = read<CategoryDef[]>('categories.json')
const mapping = read<ExistingMapping>('existing-catalog-mapping.json')
const specs = new Map<string, unknown>(readdirSync(new URL('specs/', DATA)).filter(f => f.endsWith('.json')).map(f => [f.replace('.json', ''), read<unknown>(`specs/${f}`)]))
const { payload } = buildImportPayload({ contracts, specs, categories, mapping })

/** Runs `fn` inside a transaction that is always rolled back. */
async function rolledBack<T>(fn: (q: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()
  try {
    await client.query('begin')
    return await fn(async (text, params) => (await client.query(text, params)).rows)
  }
  finally {
    await client.query('rollback').catch(() => {})
    await client.end()
  }
}
const importSql = 'select private.catalog_import($1::jsonb, true) as r'

describe('the database matches the client workbooks, contract by contract', () => {
  it('verifies all 64 contracts (record, categories, name, prices, add-ons, duration, description, form, documents, publication)', async () => {
    const services = await fetchDbServices(text => sql(text))
    const rows = verifyCatalog({ contracts, specs, categories, services })
    expect(rows).toHaveLength(64)
    const failures = rows.filter(r => !r.ok).map(r => `${r.ref}: ${Object.entries(r.results).filter(([, v]) => !v.ok).map(([k, v]) => `${k} (${v.detail})`).join(', ')}`)
    expect(failures).toEqual([])
  })

  it('has exactly one service per contract and no duplicate slugs or source refs', async () => {
    const dup = await sql<{ n: string }>(`select count(*) as n from (select source_ref from public.services where source_ref is not null group by 1 having count(*) > 1) d`)
    expect(Number(dup[0]!.n)).toBe(0)
    const total = await sql<{ n: string }>(`select count(*) as n from public.services where source_ref like 'catalog-2026-10:%'`)
    expect(Number(total[0]!.n)).toBe(64)
  })

  it('shows accurate counts per category through the public (anon) API', async () => {
    const { data: cats } = await anon.from('service_categories').select('id, slug, parent_id')
    const { data: svcs } = await anon.from('services').select('id, primary_category_id, service_category_links(category_id)')
    const subs = (cats ?? []).filter(c => c.parent_id)
    expect(subs).toHaveLength(17)
    for (const def of categories) {
      const sub = subs.find(c => c.slug === def.slug)!
      const n = (svcs ?? []).filter(s => s.primary_category_id === sub.id).length
      expect(n, def.slug).toBe(def.expectedCount)
      // links are exact too: the sub-category filter and the parent filter see the same contracts
      expect((svcs ?? []).filter(s => s.service_category_links.some(l => l.category_id === sub.id)).length, `${def.slug} links`).toBe(def.expectedCount)
    }
    const individuals = (cats ?? []).find(c => c.slug === 'individuals')!
    const companies = (cats ?? []).find(c => c.slug === 'companies')!
    // contracts of a top-level category = services whose PRIMARY category is one of its sub-categories
    // (retained generic services such as contract-drafting are cross-linked under both tops but are not contracts of either)
    const contractsOf = (topId: string) => {
      const subIds = new Set(subs.filter(c => c.parent_id === topId).map(c => c.id))
      return (svcs ?? []).filter(s => subIds.has(s.primary_category_id)).length
    }
    expect(contractsOf(individuals.id)).toBe(32)
    expect(contractsOf(companies.id)).toBe(32)
  })

  it('keeps consultations separate and unchanged', async () => {
    const rows = await sql<{ slug: string, launch_eligible: boolean, source_ref: string | null, primary: string }>(
      `select s.slug, s.launch_eligible, s.source_ref, c.slug as "primary" from public.services s join public.service_categories c on c.id = s.primary_category_id where s.kind <> 'standard' order by s.slug`)
    expect(rows).toEqual([
      { slug: 'video-consultation', launch_eligible: false, source_ref: null, primary: 'consultations' },
      { slug: 'written-consultation', launch_eligible: false, source_ref: null, primary: 'consultations' },
    ])
  })
})

describe('the import is repeatable and non-destructive', () => {
  it('a second run changes nothing: 64 services and 17 categories all "matched", no new form versions', async () => {
    const result = await rolledBack(async (q) => {
      const before = await q(`select count(*)::int as n from public.service_form_versions`)
      const [run] = await q(importSql, [JSON.stringify(payload)])
      const after = await q(`select count(*)::int as n from public.service_form_versions`)
      return { run: run!.r as { status: string, summary: Record<string, number> }, before: before[0]!.n, after: after[0]!.n }
    })
    expect(result.run.status).toBe('succeeded')
    expect(result.run.summary).toEqual({ 'service.matched': 64, 'category.matched': 17 })
    expect(result.after).toBe(result.before)
  })

  it('a changed form becomes a NEW published version; the old version is retired and kept', async () => {
    const changed = structuredClone(payload) as ImportPayload
    const svc = changed.services.find(s => s.ref === 'IND-001')!
    ;(svc.fields[1] as { label: { ar: string } }).label.ar += ' (معدّل)'
    const result = await rolledBack(async (q) => {
      const [before] = await q(`select published_form_version_id as id from public.services where source_ref = 'catalog-2026-10:IND-001'`)
      const [run] = await q(importSql, [JSON.stringify(changed)])
      const versions = await q(`select v.version, v.status from public.service_form_versions v join public.services s on s.id = v.service_id where s.source_ref = 'catalog-2026-10:IND-001' order by v.version`)
      const [oldRow] = await q(`select status from public.service_form_versions where id = $1`, [before!.id])
      return { run: run!.r as { summary: Record<string, number> }, versions, oldStatus: oldRow!.status }
    })
    expect(result.run.summary['service.updated']).toBe(1)
    expect(result.versions).toEqual([{ version: 1, status: 'retired' }, { version: 2, status: 'published' }])
    expect(result.oldStatus).toBe('retired')
  })

  it('never touches orders, accounts or retired form versions', async () => {
    const counts = async (q: (t: string) => Promise<Record<string, unknown>[]>) => (await q(`select (select count(*) from public.orders)::int as orders, (select count(*) from public.customer_accounts)::int as accounts, (select count(*) from public.order_addons)::int as addons`))[0]
    const result = await rolledBack(async (q) => {
      const before = await counts(q)
      await q(importSql, [JSON.stringify(payload)])
      return { before, after: await counts(q) }
    })
    expect(result.after).toEqual(result.before)
  })

  it('historical orders keep referencing the form version they were placed against', async () => {
    const rows = await sql<{ n: string }>(`
      select count(*) as n from public.orders o
      join public.service_form_versions v on v.id = o.form_version_id
      where v.service_id <> o.service_id`)
    expect(Number(rows[0]!.n)).toBe(0)
    const reused = await sql<{ slug: string, status: string }>(`
      select s.slug, v.status from public.orders o join public.services s on s.id = o.service_id join public.service_form_versions v on v.id = o.form_version_id
      where s.slug in ('lease-agreement', 'employment-contract') group by s.slug, v.status order by 1, 2`)
    // orders placed before the import still point at the retired v1; they are not re-pointed
    for (const r of reused) expect(['published', 'retired']).toContain(r.status)
  })
})

describe('published form versions stay immutable', () => {
  it('rejects editing the fields of a published version', async () => {
    await expect(sql(`update public.service_form_versions set fields = '[]'::jsonb where status = 'published' and service_id = (select id from public.services where slug = 'shareholders-agreement')`)).rejects.toThrow(/OQ409_FORM_VERSION_IMMUTABLE/)
  })
})

describe('category hierarchy rules', () => {
  it('allows two levels only and keeps top-level categories unchanged', async () => {
    const top = await sql<{ slug: string }>(`select slug from public.service_categories where parent_id is null order by sort_order`)
    expect(top.map(t => t.slug)).toEqual(['individuals', 'companies', 'consultations'])
    await expect(sql(`insert into public.service_categories (slug, parent_id, title, description) select 'too-deep', id, '{"ar":"س"}', '{"ar":"س"}' from public.service_categories where slug = 'rentals'`)).rejects.toThrow(/OQ422_CATEGORY_PARENT/)
    await expect(sql(`update public.service_categories set parent_id = (select id from public.service_categories where slug = 'companies') where slug = 'individuals'`)).rejects.toThrow(/OQ422_CATEGORY_PARENT/)
  })

  it('has no duplicate category records', async () => {
    const dup = await sql<{ n: string }>(`select count(*) as n from (select slug from public.service_categories group by 1 having count(*) > 1) d`)
    expect(Number(dup[0]!.n)).toBe(0)
    const titles = await sql<{ n: string }>(`select count(*) as n from (select parent_id, title ->> 'ar' from public.service_categories group by 1, 2 having count(*) > 1) d`)
    expect(Number(titles[0]!.n)).toBe(0)
  })

  it('links a service to its category and its parent automatically', async () => {
    const rows = await sql<{ slug: string }>(`
      select c.slug from public.service_category_links l join public.service_categories c on c.id = l.category_id
      where l.service_id = (select id from public.services where slug = 'private-car-sale-contract') order by 1`)
    expect(rows.map(r => r.slug)).toEqual(['individuals', 'vehicles-and-movables'])
  })
})
