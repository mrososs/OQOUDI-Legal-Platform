# Implementation report — 64-contract catalog, categories, pricing, forms and launch campaign

Status: **implemented and verified locally. Nothing is committed, nothing is deployed, hosted Supabase was not touched, and the launch campaign is NOT activated** (it is `disabled` with no date, in every database this work created).

Related reports (generated from the data, re-runnable with `npm run catalog:report`):
[source-reconciliation](source-reconciliation.md) · [category-mapping](category-mapping.md) · [pricing-validation](pricing-validation.md) · [form-coverage](form-coverage.md) · [verification-matrix](verification-matrix.md) · screenshots in [`screenshots/`](screenshots/).

## 1. Numbers

| | |
|---|---|
| Contracts found in the workbooks | **64** (32 individuals + 32 companies) |
| Source requirement items mapped to form fields | **666 / 666** (E party 82 · F technical-financial 263 · G conditions 192 · H documents 129) |
| Services **created** | **61** |
| Existing services **matched and updated in place** (same id/slug, history kept) | **3** — `employment-contract` = CO-006, `lease-agreement` = IND-004, `company-governance` = CO-011 |
| Existing services **retained unchanged** | **6** — `contract-drafting`, `contract-review`, `company-formation`, `legal-notice`, `written-consultation`, `video-consultation` |
| Existing services archived / deleted | **0** |
| Categories | 3 top-level unchanged + **17 sub-categories** (individuals 8 · companies 9), counts exactly 3/4/7/6/7/2/2/1 and 5/5/5/7/3/2/2/2/1 |
| Form inputs generated | **914** (mandatory 484 · optional 176 · **pending legal review 254**); 129 upload fields (97 required / 32 optional); 37 structured lists (repeaters) |
| Paid add-ons | VIP delivery on 64 contracts; bilingual drafting on the 32 company contracts |

(Exact per-contract figures: [form-coverage.md](form-coverage.md).)

## 2. What was built

**Source & reconciliation** — `scripts/catalog-import/extract.ts` reads the three workbooks (pinned by SHA-256), compares the consolidated workbook with the detailed ones cell by cell and writes `contracts.source.json` with row-level provenance. The one known discrepancy was reproduced and resolved by the stated precedence rule: **IND-009 «عقد اتفاق على الخلع الرضائي والتنازل»** (consolidated row 10) had columns C–I blank; they were restored from the detailed workbook and the matching prices kept. No text or price conflicts exist; the extractor would stop rather than choose a number.

**Database (6 schema migrations, additive)** — `20261016174000` hierarchy (`parent_id`, two-level guard, auto-linked parent, `source_ref`, `translation_status`) · `…174100` pricing model (launch price/eligibility, add-on `kind` + launch price, nullable regular add-on price, order/add-on snapshots, price history) · `…174200` launch campaign (setting seeded disabled, status functions, admin-only setter) · `…174300` order pricing (`private.price_order`, `order_create`, extended `admin_save_service` / `admin_update_prices`) · `…174400` import engine + tracking tables · `…174600` admin form-stats view.
**Catalog data** is a generated, idempotent **seed** — `supabase/seeds/catalog_contracts.sql` (one call to `private.catalog_import`) — wired into `config.toml` to run after `seed.sql`. *(It was first written as a migration; a from-scratch run proved a migration cannot work because the top-level categories and original services come from `seed.sql`.)*

**Pricing** — see [pricing-validation.md](pricing-validation.md). Prices are integer piasters; the launch price and add-on fees are stored **exactly as supplied**. `private.price_order` decides the charged amount at order creation from the **database clock**; the frontend never sends or influences a price (an API test posts `totalMinor: 1` and is ignored). Orders store a `pricing_snapshot`, per-add-on regular/launch/applied prices, and `has_vip_delivery` / `has_bilingual_drafting` flags, so history is unaffected by later price edits or the campaign ending.

**Launch campaign** — `/dashboard/campaign`: enable + explicit Cairo activation date/time, computed end (exactly 15 Cairo calendar days, DST-safe), statuses Scheduled / Active / Expired / Disabled, per-contract inclusion switches, promotional price preview, instant disable; dates cannot be moved while active; every change is audited. Public side: banner above the (untouched) navbar, `LAUNCH OFFER · 50% OFF` badge, struck-through original + launch price + discount, a dedicated section and promo CTA on contract pages, countdown from the **server clock** (one shared state, SSR-consistent, no per-visitor timer, ticks after mount, re-syncs each minute and at expiry). At expiry the banner, badges, launch prices and promo CTA disappear without a reload. Scheduled/disabled campaigns expose nothing publicly (no dates).

**Dynamic forms** — each contract has its own form version compiled from its row (numbered steps: Party details → Contract details → Financial & technical → Special conditions → Required documents, then the platform's review step). The form schema gained a structured **`repeater`** field (all partners, heirs, children, installments, inventories, milestones…) and a **`legalReview`** flag for fields whose mandatory status the source does not state (never enforced; badge in the admin builder). Optional fields are labelled «(اختياري)». Documents are one upload field per source item.

**Public site** — hierarchical browsing (`/services/:category/:sub`, accurate counts, grouped by sub-category, search, price-in-force sorting, price-range and launch-offer filters, a select on phones), homepage category cards with sub-category links, contract pages with breadcrumb, derived "what you need to prepare" card, add-on prices, English "translation pending legal review" notice, JSON-LD with the price in force.

**Admin** — services list filters (main/sub-category, search, offer, translation), editor tabs extended (launch price, eligibility, add-on kinds, regular/launch add-on prices with live preview; hierarchical category picker; translation status; repeater column editor; review flag), import-status panel, campaign page. Staff see VIP / bilingual markers and a price-snapshot card on every order; customers see the same on their order.

**Manual payment workflow** — unchanged; order totals feed it exactly as before (pre-existing payment E2E passes).

## 3. Verification (evidence)

| Check | Result |
|---|---|
| `nuxt typecheck` | ✅ 0 errors |
| `eslint .` | ✅ 0 problems |
| Unit tests (Vitest) | ✅ **97 / 97** (pricing, campaign windows incl. DST, countdown text, repeater validation, catalog source/pricing/specs, verifier mutation tests) |
| Integration tests (real Postgres + dev server) | ✅ **165 / 165** — includes the whole pre-existing security/lifecycle/payment suites |
| Playwright E2E, all projects | ✅ see §3.1 |
| Production build (`npm run build`) | ✅ |
| **From-scratch database**: all migrations → `seed.sql` → catalog seed on an isolated throwaway stack | ✅ `verify` 64/64; first import 61 created + 3 updated; second run 64 + 17 "matched" |
| `supabase db diff` (migration files vs local DB) | ✅ "No schema changes found" |
| **Source-to-database check of all 64 rows** (13 DB checks + detail route HTTP 200) | ✅ **64 / 64** → [verification-matrix.md](verification-matrix.md) |
| Edge cases from the brief | ✅ contract 9 restored · half-pound rounding kept as supplied · VIP rounding (IND-027: 187/562) · different documents per contract · optional vs required uploads · both add-ons together · campaign before / on start / during / after expiry · historical prices unchanged · repeat import without duplicates |

Notable defects **found by this verification and fixed**: (1) data migration failed on a fresh database (→ seed); (2) auto-link trigger collided with `seed.sql` (→ deferred constraint trigger); (3) `admin_save_service` ignored `translationStatus` on create; (4) admin campaign page's SSR fetch dropped the session cookie (→ `useRequestFetch`); (5) several spec/validator gaps raised by the authoring agents (optional marker inside bundled party items; link/number items in the documents group).

### 3.1 E2E
Pre-existing journeys (register → order → manual payment → admin approve/reject, delivery/acceptance, responsive pages) all pass against the new catalog. New specs: `catalog.spec.ts` (hierarchy browsing, detail pages, individual order with VIP + proof payment + admin view, company order with repeater/documents/bilingual, campaign: invisible before activation, admin activation through the UI, banner/badge/detail copy, CTA, checkout total = launch price, historical snapshot after expiry, **live expiry without reload**, admin disable, English LTR, mobile RTL overflow checks) and `admin-catalog.spec.ts` (list filters, launch pricing tab, form builder, import panel). Result of the final full run (desktop + mobile projects): **46 passed, 1 skipped** (the skip is a pre-existing desktop-only guard in `responsive.spec.ts`). A hydration guard added afterwards (no hydration mismatch / console errors on six pages in both languages while the offer is active) passes when run on its own.

## 4. Bucketed status

**Implemented & verified** — everything in §2 except the items below.

**Implemented, not verified**
- Hosted Supabase / Vercel: not touched (by instruction). The migrations were verified from scratch and by diff locally; the catalog seed assumes the hosted DB already contains the top-level categories and the original seed services (true as of 2026-10-15).
- Visual review used Playwright screenshots (Chrome DevTools MCP failed to connect — timeout); no real iOS Safari/Android device run, no automated accessibility audit (axe/Lighthouse). New components use semantic roles/labels (`region`, `timer`, `aria-live="off"`, `sr-only` price labels), but this was not audited.
- Merge with `feature/single-admin-mode` (separate worktree): not performed. That branch's merge guide (docs/operations/single-admin-mode.md §14) already lists the overlapping files; its migration no longer redefines `order_create`, so the SQL does not conflict. After merging, re-run the full suite once.
- Only 3 of the 64 forms were driven through the browser UI; all 64 were driven through the real order API (empty submission rejected for **exactly** the required fields; valid answers + real uploads accepted; server-set price).

**Mocked / simulated**
- Payments remain `manual_demo` (InstaPay / Vodafone Cash / PayPal proof upload, admin approval) — unchanged.
- Campaign time windows in tests are set directly in the database (nobody waits 15 days); the expiry test uses an 8-second window.
- English copy (titles, descriptions, labels, options) is **machine-drafted** and flagged `pending_review` in the database and on the English service pages.

**Blocked / needs a decision** — see §6.

## 5. Decisions made (and why)

1. **Reuse 3 existing services** where the offering is the same (existing prices 1,800 / 1,200 were identical to the client's originals); old form versions are retired, never edited; seed-demo orders updated to the new forms. Reversible by archiving.
2. **Company VIP has no regular price** (not supplied) → offered only while the launch price applies; checkout rejects it otherwise. One admin edit per contract fixes this once the client approves a rule.
3. **Post-promotion add-on fee = supplied total − supplied original** (individuals N−J, companies R−J): exact subtraction of two supplied numbers.
4. **Supplied rounding kept** (17 half-pound add-on fees were truncated by the client) and flagged for confirmation.
5. **Mandatory status**: unconditional core fields `required`; explicit «إن وجد/اختياري» and all column-G choices optional; everything uncertain optional + `legalReview` (254 inputs). Not "all required".
6. **Steps = numbered sections on one page**, not a multi-page wizard (the platform's flow keeps one form step + review).
7. **Campaign digits**: banner/badge/countdown numbers use Western digits exactly as in the approved copy; prices keep the site's Arabic-Indic formatting.
8. **Services are imported published** (so the catalog is browsable); `npm run catalog:build -- --draft` produces a seed that imports them as drafts for review first.

## 6. Open items for the client / legal / owner

Commercial ([pricing-validation.md](pricing-validation.md)): company VIP after the launch period · VIP+bilingual combined after launch · rounding policy for 17 add-on fees · confirm N−J / R−J reading.
Legal/product ([form-coverage.md](form-coverage.md)): review the 254 `legalReview` fields and the open questions listed there · approve or replace the English translations · confirm IND-028's «الشهر العقاري» for a car · CO-018/CO-021 fee units.
Catalog: confirm the three reused services (lease scope narrowed to residential; employment = individual contract; governance price 4,500 → 4,000) and whether `company-formation` should stay next to CO-001.
Owner: Top-level directory pages count legacy cross-linked services (Individuals shows 35 = 32 contracts + `contract-drafting`, `contract-review`, `legal-notice`); the homepage shows "32 contracts". Say if the legacy generic services should be archived.

## 7. Rollout checklist (requires your approval — none of this was run)

1. Review and commit (nothing is committed).
2. Hosted: `supabase db push` → applies the 6 additive migrations (touches `service_addons.price_minor` nullability, icon whitelist, replaces `order_create`, `admin_save_service`, `admin_update_prices`).
3. Hosted: `psql "<url>" -f supabase/seeds/catalog_contracts.sql` (idempotent; add `--draft` at build time to import unpublished) → `npm run catalog:verify -- --db <url> --http <site>` must print 64/64.
4. Deploy the app; check `/dashboard/catalog-import`.
5. Resolve §6, then enable the campaign in **Dashboard → Launch campaign** with an explicit date.

## 8. Local environment notes

Local stack `oqoudi` (ports 553xx) has everything applied; the campaign is disabled. Throw-away services `zz-admin-*` from the admin API tests remain **archived** under the consultations category (published form versions cannot be deleted by design). A second stack `oqoudi-sa` belongs to the single-admin worktree and was never touched.
Tooling pitfall: shell heredocs/`node -e` containing backticks corrupt files on this machine — scripts here are written with the editor tool.

## 9. File map

`supabase/migrations/20261016174000…174600_*.sql` (6) · `supabase/seeds/catalog_contracts.sql` · `shared/catalog/*` (source, spec DSL, pricing, build, verify) · `shared/domain/{pricing,formSchema,serviceAdmin,errors}.ts` · `scripts/catalog-import/*` (extract, validate-specs, build, verify, report, 64 specs, SPEC-AUTHORING.md) · `server/api/{campaign.get,admin/campaign.*}` · `app/plugins/launch-campaign*.ts`, `app/composables/useLaunchCampaign.ts`, `useCatalog.ts`, `useRequestFlow.ts` · `app/components/{layout/LaunchOfferBanner,services/*,forms/RepeaterField,admin/*,orders/*,dashboard/DashboardPricingCard}.vue` · `app/pages/{services/[category]/*,dashboard/campaign,dashboard/catalog-import,dashboard/services/index,service/[slug]/index}.vue` · `i18n/locales/{ar,en}.json` · tests: 5 new unit files, 4 integration files, 2 E2E specs.
