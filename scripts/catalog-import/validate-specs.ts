/**
 * Validates contract specs against the source and the platform form schema.
 *
 *   npx vite-node scripts/catalog-import/validate-specs.ts                 # all specs present
 *   npx vite-node scripts/catalog-import/validate-specs.ts -- IND-001 CO-002
 *   npx vite-node scripts/catalog-import/validate-specs.ts -- --show IND-005   # print numbered source items
 *   npx vite-node scripts/catalog-import/validate-specs.ts -- --all        # also fail on missing specs
 *
 * Exit code 1 when any validated spec has errors (or, with --all, when a spec is missing).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { validateSpec } from '../../shared/catalog/spec.ts'
import { sourceItems, type SourceContract } from '../../shared/catalog/source.ts'

const DIR = fileURLToPath(new URL('./data/', import.meta.url))
const contracts: SourceContract[] = JSON.parse(readFileSync(`${DIR}source/contracts.source.json`, 'utf8'))
const args = process.argv.slice(2).filter(a => a !== '--')
const show = args.includes('--show')
const all = args.includes('--all')
const refs = args.filter(a => !a.startsWith('--'))

if (show) {
  for (const ref of refs) {
    const c = contracts.find(x => x.ref === ref)
    if (!c) { console.error(`unknown ref ${ref}`); process.exit(1) }
    const items = sourceItems(c)
    console.log(`\n=== ${c.ref}  ${c.nameAr}  [${c.subcategoryAr}]  ${c.turnaround}`)
    console.log(`D: ${c.descriptionAr}`)
    for (const col of ['E', 'F', 'G', 'H'] as const) items[col].forEach((t, i) => console.log(`${col}${i + 1}: ${t}`))
  }
  process.exit(0)
}

const specFiles = new Set(readdirSync(`${DIR}specs/`).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')))
const targets = refs.length ? refs : contracts.map(c => c.ref).filter(r => specFiles.has(r))
let failed = 0
let ok = 0
const slugs = new Map<string, string>()
for (const ref of targets) {
  const c = contracts.find(x => x.ref === ref)
  if (!c) { console.error(`unknown ref ${ref}`); failed++; continue }
  const path = `${DIR}specs/${ref}.json`
  if (!existsSync(path)) { console.error(`✗ ${ref}: spec file missing`); failed++; continue }
  const { spec, report } = validateSpec(c, JSON.parse(readFileSync(path, 'utf8')))
  if (spec) {
    const other = slugs.get(spec.slug)
    if (other) report.errors.push(`slug "${spec.slug}" is already used by ${other}`)
    slugs.set(spec.slug, ref)
  }
  if (report.errors.length) {
    failed++
    console.error(`✗ ${ref}  ${c.nameAr}`)
    for (const e of report.errors) console.error(`    - ${e}`)
  }
  else {
    ok++
    console.log(`✓ ${ref}  fields=${report.fieldCount} inputs=${report.inputCount} (req ${report.required} / opt ${report.optional} / review ${report.review}) files=${report.fileFields} repeaters=${report.repeaters} items ${report.itemsCovered}/${report.itemsTotal}`)
  }
}
const missing = contracts.filter(c => !specFiles.has(c.ref)).map(c => c.ref)
console.log(`\n${ok} valid, ${failed} invalid, ${missing.length} specs not written yet${missing.length && missing.length <= 70 ? ` (${missing.join(', ')})` : ''}`)
if (failed || (all && missing.length)) process.exit(1)
