/**
 * Step 1 — read the three client workbooks and write deterministic JSON.
 *
 *   npx vite-node scripts/catalog-import/extract.ts -- \
 *     --consolidated "<دليل_عقود…xlsx>" --individuals "<عقود_الأفراد…xlsx>" --companies "<عقود_الشركات…xlsx>"
 *
 * Source precedence (client brief):
 *   1. the separate detailed workbooks win for text columns C–I (descriptions, inputs, documents, turnaround);
 *   2. the consolidated workbook is the inventory and the reference for price columns;
 *   3. any commercial (price) conflict is NOT resolved silently — the script stops.
 *
 * Output (data/source/):
 *   contracts.source.json   64 canonical rows with row-level provenance
 *   source-manifest.json    file hashes, sheets, headers
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ExcelJS from 'exceljs'
import type { CatalogKind, SourceContract, SourceDiscrepancy, SourcePrices } from '../../shared/catalog/source.ts'

const OUT_DIR = fileURLToPath(new URL('./data/source/', import.meta.url))

const INDIVIDUAL_HEADERS: Record<string, string> = {
  A: 'م', B: 'التصنيف الفرعي', C: 'اسم العقد / الاتفاقية', D: 'وصف مختصر للخدمة',
  E: 'بيانات الأطراف المطلوبة (حقول الفورم)', F: 'البيانات الفنية والمالية المطلوبة (حقول الفورم الأساسية)',
  G: 'الشروط الخاصة والإضافية (اختيارات العميل)', H: 'المرفقات المطلوب رفعها', I: 'مدة التنفيذ القياسية (1-3 أيام)',
  J: 'السعر الأصلي العادل (ج.م)', K: 'سعر الإطلاق بخصم 50% لمدة 15 يوم (ج.م)',
  L: 'قيمة إضافة VIP استلام خلال 6 ساعات (+50% وقت الإطلاق) (ج.م)',
  M: 'إجمالي السعر شامل VIP وقت الإطلاق (ج.م)', N: 'إجمالي السعر شامل VIP بعد فترة الإطلاق (ج.م)',
}
const COMPANY_HEADERS: Record<string, string> = {
  A: 'م', B: 'التصنيف الفرعي', C: 'اسم العقد / الاتفاقية / اللائحة', D: 'وصف مختصر للخدمة',
  E: 'بيانات الأطراف المطلوبة (حقول الفورم)', F: 'البيانات الفنية والمالية المطلوبة (حقول الفورم الأساسية)',
  G: 'الشروط الخاصة والإضافية (اختيارات العميل)', H: 'المرفقات المطلوب رفعها', I: 'مدة التنفيذ القياسية (1-3 أيام)',
  J: 'السعر الأصلي العادل (ج.م)', K: 'سعر الإطلاق بخصم 50% لمدة 15 يوم (ج.م)',
  L: 'قيمة إضافة VIP خلال 6 ساعات (+50% وقت الإطلاق) (ج.م)', M: 'إجمالي السعر شامل VIP وقت الإطلاق (ج.م)',
  N: 'دعم الصياغة ثنائية اللغة (عربي/إنجليزي)', O: 'قيمة إضافة ثنائي اللغة (+55% وقت الإطلاق) (ج.م)',
  P: 'إجمالي السعر شامل ثنائي اللغة وقت الإطلاق (ج.م)', Q: 'الإجمالي شامل (VIP + ثنائي اللغة) وقت الإطلاق (ج.م)',
  R: 'إجمالي السعر شامل ثنائي اللغة بعد فترة الإطلاق (ج.م)',
}

const TEXT_COLUMNS = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const
const BILINGUAL_AVAILABLE_TEXT = 'نعم متاح (+55%)'

type Row = Record<string, string | number | null>
interface Sheet { workbook: string, sheet: string, rows: Map<number, Row>, headers: Row }

function arg(name: string): string {
  const i = process.argv.indexOf(`--${name}`)
  const v = i >= 0 ? process.argv[i + 1] : undefined
  if (!v) throw new Error(`Missing --${name} <path>`)
  return resolve(v)
}

function cell(v: ExcelJS.CellValue): string | number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v
  if (typeof v === 'string') return v.trim() === '' ? null : v.trim()
  if (typeof v === 'object' && 'richText' in v) return v.richText.map(r => r.text).join('').trim() || null
  if (typeof v === 'object' && 'result' in v) return cell(v.result as ExcelJS.CellValue)
  throw new Error(`Unsupported cell value: ${JSON.stringify(v)}`)
}

async function readSheet(file: string, sheetIndex: number): Promise<Sheet & { sha256: string, sheetNames: string[] }> {
  const bytes = readFileSync(file)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(bytes as unknown as ArrayBuffer)
  const ws = wb.worksheets[sheetIndex]
  if (!ws) throw new Error(`${basename(file)}: no worksheet #${sheetIndex}`)
  const rows = new Map<number, Row>()
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    const out: Row = {}
    row.eachCell({ includeEmpty: false }, (c) => {
      out[c.address.replace(/\d+/g, '')] = cell(c.value)
    })
    rows.set(n, out)
  })
  return {
    workbook: basename(file),
    sheet: ws.name,
    rows,
    headers: rows.get(1) ?? {},
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sheetNames: wb.worksheets.map(s => s.name),
  }
}

function assertHeaders(sheet: Sheet, expected: Record<string, string>) {
  for (const [col, text] of Object.entries(expected)) {
    if (sheet.headers[col] !== text) {
      throw new Error(`${sheet.workbook} / ${sheet.sheet}: header ${col}1 is ${JSON.stringify(sheet.headers[col])}, expected ${JSON.stringify(text)}`)
    }
  }
}

const num = (v: string | number | null | undefined, where: string): number => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`Expected a number at ${where}, got ${JSON.stringify(v)}`)
  return v
}

function individualPrices(row: Row, where: string): SourcePrices {
  return {
    original: num(row.J, `${where}J`),
    launch: num(row.K, `${where}K`),
    vipLaunch: num(row.L, `${where}L`),
    totalVipLaunch: num(row.M, `${where}M`),
    totalVipRegular: num(row.N, `${where}N`),
    bilingualAvailable: false,
    bilingualLaunch: null,
    totalBilingualLaunch: null,
    totalVipBilingualLaunch: null,
    totalBilingualRegular: null,
  }
}

function companyPrices(row: Row, where: string): SourcePrices {
  if (row.N !== BILINGUAL_AVAILABLE_TEXT) throw new Error(`${where}N: unexpected bilingual availability ${JSON.stringify(row.N)}`)
  return {
    original: num(row.J, `${where}J`),
    launch: num(row.K, `${where}K`),
    vipLaunch: num(row.L, `${where}L`),
    totalVipLaunch: num(row.M, `${where}M`),
    totalVipRegular: null,
    bilingualAvailable: true,
    bilingualLaunch: num(row.O, `${where}O`),
    totalBilingualLaunch: num(row.P, `${where}P`),
    totalVipBilingualLaunch: num(row.Q, `${where}Q`),
    totalBilingualRegular: num(row.R, `${where}R`),
  }
}

function reconcile(
  catalog: CatalogKind,
  detailed: Sheet,
  consolidated: Sheet,
  priceCols: string,
  readPrices: (row: Row, where: string) => SourcePrices,
): SourceContract[] {
  const prefix = catalog === 'individuals' ? 'IND' : 'CO'
  const out: SourceContract[] = []
  const rowNumbers = [...new Set([...detailed.rows.keys(), ...consolidated.rows.keys()])].filter(n => n > 1).sort((a, b) => a - b)
  for (const n of rowNumbers) {
    const d = detailed.rows.get(n)
    const c = consolidated.rows.get(n)
    const discrepancies: SourceDiscrepancy[] = []
    if (!d) throw new Error(`${detailed.workbook}: row ${n} exists only in the consolidated workbook`)
    if (!c) throw new Error(`${consolidated.workbook}: row ${n} is missing`)
    const number = num(d.A, `${detailed.workbook}!A${n}`)
    if (c.A !== d.A) throw new Error(`Row ${n}: sequence number differs (${c.A} vs ${d.A})`)

    const restoredColumns: string[] = []
    for (const col of TEXT_COLUMNS) {
      const dv = d[col] ?? null
      const cv = c[col] ?? null
      if (dv === null) throw new Error(`${detailed.workbook}!${col}${n} is empty in the detailed workbook`)
      if (cv === null) {
        restoredColumns.push(col)
      }
      else if (cv !== dv) {
        discrepancies.push({
          kind: 'text_conflict',
          columns: [col],
          detail: `consolidated ${JSON.stringify(cv)} ≠ detailed ${JSON.stringify(dv)}`,
          unresolved: false,
          resolution: 'Detailed workbook used (source precedence rule 1).',
        })
      }
    }
    if (restoredColumns.length) {
      discrepancies.unshift({
        kind: 'missing_in_consolidated',
        columns: restoredColumns,
        detail: `Consolidated worksheet "${consolidated.sheet}" row ${n} has no value in column(s) ${restoredColumns.join(', ')} (contract number ${number}).`,
        unresolved: false,
        resolution: `Restored from "${detailed.workbook}" row ${n}; prices (J–${priceCols.at(-1)}) are present in both workbooks and match.`,
      })
    }

    // Prices: consolidated is the reference; the detailed workbook must agree.
    const consolidatedPrices = readPrices(c, `${consolidated.workbook}!${consolidated.sheet}!`)
    const detailedPrices = readPrices(d, `${detailed.workbook}!`)
    for (const col of priceCols) {
      if (c[col] !== d[col]) {
        const d1: SourceDiscrepancy = {
          kind: 'price_conflict',
          columns: [col],
          detail: `${col}${n}: consolidated ${JSON.stringify(c[col])} ≠ detailed ${JSON.stringify(d[col])}`,
          unresolved: true,
          resolution: 'UNRESOLVED — needs a business decision; extraction stops.',
        }
        discrepancies.push(d1)
      }
    }
    const unresolved = discrepancies.filter(x => x.unresolved)
    if (unresolved.length) {
      throw new Error(`Unresolved commercial conflict(s):\n${unresolved.map(x => ` - ${x.detail}`).join('\n')}`)
    }

    out.push({
      ref: `${prefix}-${String(number).padStart(3, '0')}`,
      catalog,
      number,
      subcategoryAr: String(d.B),
      nameAr: String(d.C),
      descriptionAr: String(d.D),
      partyInfo: String(d.E),
      technicalFinancial: String(d.F),
      specialConditions: String(d.G),
      documents: String(d.H),
      turnaround: String(d.I),
      prices: consolidatedPrices ?? detailedPrices,
      provenance: {
        detailed: { workbook: detailed.workbook, sheet: detailed.sheet, row: n },
        consolidated: { workbook: consolidated.workbook, sheet: consolidated.sheet, row: n },
        restoredColumns,
        discrepancies,
      },
    })
  }
  return out
}

async function main() {
  const consolidatedFile = arg('consolidated')
  const individualsFile = arg('individuals')
  const companiesFile = arg('companies')

  const [consInd, consCo, indSep, coSep] = await Promise.all([
    readSheet(consolidatedFile, 0),
    readSheet(consolidatedFile, 1),
    readSheet(individualsFile, 0),
    readSheet(companiesFile, 0),
  ])
  for (const s of [consInd, indSep]) assertHeaders(s, INDIVIDUAL_HEADERS)
  for (const s of [consCo, coSep]) assertHeaders(s, COMPANY_HEADERS)

  const individuals = reconcile('individuals', indSep, consInd, 'JKLMN', individualPrices)
  const companies = reconcile('companies', coSep, consCo, 'JKLMNOPQR', companyPrices)
  const contracts = [...individuals, ...companies]
  if (individuals.length !== 32 || companies.length !== 32) {
    throw new Error(`Expected 32 + 32 contracts, found ${individuals.length} + ${companies.length}`)
  }

  writeFileSync(`${OUT_DIR}contracts.source.json`, `${JSON.stringify(contracts, null, 2)}\n`, 'utf8')
  writeFileSync(`${OUT_DIR}source-manifest.json`, `${JSON.stringify({
    note: 'Workbooks are NOT committed; this manifest pins the exact files the catalog was extracted from.',
    workbooks: [
      { file: basename(consolidatedFile), sha256: consInd.sha256, worksheets: consInd.sheetNames, role: 'consolidated inventory (64 contracts) — price reference' },
      { file: basename(individualsFile), sha256: indSep.sha256, worksheets: indSep.sheetNames, role: 'individuals — detailed (text source of truth)' },
      { file: basename(companiesFile), sha256: coSep.sha256, worksheets: coSep.sheetNames, role: 'companies — detailed (text source of truth)' },
    ],
    counts: { individuals: individuals.length, companies: companies.length, total: contracts.length },
  }, null, 2)}\n`, 'utf8')

  const restored = contracts.filter(c => c.provenance.restoredColumns.length)
  console.log(`extracted ${contracts.length} contracts (${individuals.length} individuals + ${companies.length} companies)`)
  for (const c of restored) console.log(`  restored ${c.ref} "${c.nameAr}" columns ${c.provenance.restoredColumns.join(',')} from the detailed workbook`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
