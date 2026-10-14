// Dev helper: screenshots of local pages for visual comparison with design-reference/screens.
// Usage: node scripts/screenshot.mjs <outDir> <width> <path> [path...]
//   Optional env: SHOT_EMAIL / SHOT_PASSWORD to sign in first.
import { chromium } from '@playwright/test'

const [outDir, width, ...paths] = process.argv.slice(2)
const base = process.env.SHOT_BASE ?? 'http://localhost:3000'

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: Number(width), height: 900 }, locale: 'ar-EG' })
const page = await context.newPage()

if (process.env.SHOT_EMAIL) {
  await page.goto(`${base}/auth/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type=email]', process.env.SHOT_EMAIL)
  await page.fill('input[type=password]', process.env.SHOT_PASSWORD ?? '')
  await page.click('button[type=submit]')
  await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 })
}

for (const p of paths) {
  await page.goto(`${base}${p}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const name = p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'
  await page.screenshot({ path: `${outDir}/${name}-${width}.png`, fullPage: process.env.SHOT_FULL === '1' })
  console.log('saved', name)
}
await browser.close()
