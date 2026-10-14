// Usage: node merge-i18n.mjs <locales-dir> <patch.json>
// patch.json = { "ar": {...}, "en": {...} } — deep-merged into the locale files.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [dir, patchFile] = process.argv.slice(2)
const patch = JSON.parse(readFileSync(patchFile, 'utf8'))

function merge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      target[k] = merge(target[k] && typeof target[k] === 'object' ? target[k] : {}, v)
    }
    else {
      target[k] = v
    }
  }
  return target
}

for (const locale of Object.keys(patch)) {
  const file = join(dir, `${locale}.json`)
  const data = JSON.parse(readFileSync(file, 'utf8'))
  writeFileSync(file, `${JSON.stringify(merge(data, patch[locale]), null, 2)}\n`)
  console.log('updated', file)
}
