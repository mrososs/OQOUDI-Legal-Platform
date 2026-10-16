# Authoring a contract spec

One JSON file per contract in `scripts/catalog-import/data/specs/<REF>.json` (`IND-001` … `IND-032`, `CO-001` … `CO-032`).
A spec turns the client's workbook row (columns E–H) into that contract's **dynamic request form**. Reference
examples that already pass validation: `IND-001.json` (sale, installments repeater), `IND-004.json`
(lease, clause checkbox group), `CO-002.json` (shareholders agreement, multi-party repeaters).

```bash
# print the numbered source items you must cover (E1, F3, G2, H1 …)
npx vite-node scripts/catalog-import/validate-specs.ts -- --show IND-005
# validate your specs (fix every error until all are ✓)
npx vite-node scripts/catalog-import/validate-specs.ts -- IND-005 IND-006
```

Source of truth: `scripts/catalog-import/data/source/contracts.source.json` (do not edit). Never invent
requirements, claims, guarantees or options that are not in the source text.

## Shape

```jsonc
{
  "ref": "IND-005",
  "slug": "furnished-apartment-lease-contract",          // english kebab-case, unique, <= 60 chars
  "en": { "title": "...", "description": "..." },        // English presentation copy (see Translation)
  "parties":      [ { "key": "landlord", "ar": "المؤجر", "en": "Landlord", "src": ["E1"], "fields": ["name", "national_id", { "kind": "address", "req": "review" }, { /* custom field, short id */ } ] } ],
  "partyFields":  [ /* standalone party-step fields, e.g. a repeater of "all partners"; src column E */ ],
  "details":      [ /* column F items that describe the subject / terms / dates */ ],
  "financial":    [ /* column F items that are amounts, payments, fees, schedules */ ],
  "special":      [ /* column G — customer choices, never required */ ],
  "documents":    [ /* column H — one file field per item */ ]
}
```

A field: `{ "id", "src": ["F2"], "type", "ar", "en", "req", "help"?, "options"?, "min"?, "max"?, "maxLength"?, "columns"?, "minItems"?, "maxItems"?, "accept"?, "maxFiles"?, "maxSizeMb"? }`
Types: `text`, `textarea`, `number`, `date`, `select`, `radio`, `checkbox`, `multiselect`, `file`, `repeater`.
Ids: `^[a-z][a-z0-9_]{0,39}$`, unique in the whole form. Party macro ids are generated as `<partyKey>_<kind>`;
custom fields inside a party get the same `<partyKey>_` prefix automatically (use short ids there).
`ar`/`en` are both mandatory everywhere (fields, options, columns, help).

### Party macros (fixed labels, appended with " — <party>")
`name`, `national_id`, `national_id_or_passport`, `address`, `residence`, `birth_date`, `commercial_register`,
`tax_card`, `company_name`, `legal_rep`. Use a string for the default (`req: yes`) or `{ "kind": "...", "req": "..." }`.
Use a custom field when the source wording differs (e.g. "الاسم رباعي", "العنوان الحالي", "الصفة أو رقم التوكيل").
Only ask for what the source lists for that party (e.g. "بالرقم القومي والعنوان" → name + national_id + address).
A source item that names several parties ("بيانات البائع والمشتري") → one `parties` entry per party, each `src` = that item.

## Mandatory status — `req`

The workbook does not always say whether an input is mandatory. **Never assume everything is required.**

| `req` | Runtime | Use when |
|---|---|---|
| `yes` | required | party identity (name + ID number/commercial register), the core terms a lawyer cannot draft without (subject identification, price/rent/fee/amount, term dates), and documents in column H without an optional marker that are clearly unconditional |
| `no` | optional | the source text says «إن وجد / إن وجدت / اختياري»; **all column G fields** (customer choices) |
| `review` | optional + flagged `legalReview` | the source does not make it clear: situational/conditional items, details the customer may not know up front, alternatives, negotiable terms, schedules, registry numbers. **When unsure choose `review`, not `yes`.** |

The validator rejects `yes` on an item with an explicit optional marker and on any column-G field.

## Choosing the field type

* amounts (ثمن، قيمة، مبلغ، أجر، أتعاب، نفقة، راتب، رسوم، مقابل، تكلفة، عمولة قيمة) → `number`, `min: 0`, label ends with `(ج.م)` / `(EGP)`
* percentages (نسبة) → `number`, `min: 0`, `max: 100`, label ends with `(%)`
* dates (تاريخ، موعد/ميعاد التسليم) → `date`; "مدة … (تاريخ البداية والنهاية)" → two `date` fields (start, end), same `src`
* durations without dates (مدة العقد، فترة ضمان) → `text` (units are not specified by the source)
* counts (عدد) → `number`, `min: 0`; areas → `number`
* names, ids, numbers, short values, addresses → `text`; descriptions, multi-part items, clauses → `textarea`
* an item that **states the alternatives itself** ("حصري أم غير حصري", "بالمقطوعية أم نسبة إشراف", "بدون أجر أم بأجر") → `radio` with exactly those options (values snake_case). Never add options the source does not state.
* a list of repeating entities → `repeater` (see below). Max 8 columns, `maxItems <= 50`, only columns the source text implies.

### Repeaters — use when the source says "all/each" of a plural group or asks for a schedule/list
all partners / heirs / shareholders / founders / children (with ages) / installment schedule / milestones /
commission tiers / inventory of items. Give `minItems` when at least N rows are inherently required (e.g. 2 partners).

## Column G (special / additional conditions — customer choices)

Every G item must be covered, always `req: "no"`:
1. Pure "include this clause" items → ONE `checkbox` field whose options are the clause items verbatim (`src` = all of them) plus ONE optional `textarea` "تفاصيل أو ملاحظات على الشروط المختارة" (see IND-004).
2. Items that clearly need a value/detail (amount, duration, penalty value, date, a stated either/or choice) → their own `number`/`text`/`date`/`textarea`/`radio` field.

## Column H (documents)

One `file` field per H item, id prefix `doc_`, label = the item text (verbatim, optional-marker wording removed from the label when `req: "no"`).
`maxFiles` 1–2 for a single document, up to 4 for ID copies of two parties, up to 10 for many parties.
`req: "yes"` unless the item is marked optional (`no`) or situational (`review`).

## Labels

Arabic labels reuse the source wording (trim the parenthetical sub-lists once they become fields). Add units, not meaning.
Do not add fields that the source does not request (no phone/e-mail/"notes" fields) other than splitting one item into logical inputs.
Every source item (E1…, F1…, G1…, H1…) must be covered by at least one field's `src` — the validator checks this.

## Translation (English)

`en` strings are presentation copy. They are generated, **not lawyer-approved**; the catalog flags them `pending_review`.
Keep them literal and concise, keep any Latin terms already in the Arabic (SHA, NDA, KPIs …), do not add promises or legal claims.
Glossary: المؤجر Landlord · المستأجر Tenant · الشرط الجزائي penalty clause · الصيغة التنفيذية executory formula ·
الشهر العقاري Real Estate Registry · إعلام الوراثة inheritance declaration (إعلام الوراثة) · مؤخر الصداق deferred dowry ·
نفقة العدة iddah maintenance · المتعة mut'ah (consolation payment) · القوة القاهرة force majeure · السجل التجاري commercial register ·
البطاقة الضريبية tax card · التوكيل power of attorney · إخلاء طرف clearance · عهدة custody item/asset.

## Slugs

English kebab-case describing the contract, suffix `-contract`, `-agreement` or `-policy`/`-regulation` as fits; unique across all 64.
