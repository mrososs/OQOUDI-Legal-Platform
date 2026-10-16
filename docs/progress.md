# Progress report — milestone 2 (2026-10-16): 64-contract catalog, sub-categories, exact pricing, launch campaign

Full write-up: [`docs/catalog-import/implementation-report.md`](catalog-import/implementation-report.md). **Nothing is committed or deployed; hosted Supabase is untouched; the launch campaign is disabled (no date) everywhere.**

| Area | State |
|---|---|
| 64 contracts from the 3 client workbooks | ✅ imported (61 created, 3 existing services reused in place, 6 retained), 64/64 verified against the workbooks (13 DB checks + detail route) |
| Sub-categories (8 individuals + 9 companies) | ✅ two-level hierarchy, SEO routes, accurate counts, mobile select |
| Pricing (exact client values, integer piasters, server-side) | ✅ launch price/eligibility, VIP + bilingual add-ons, order snapshots; 17 supplied rounding cases and the missing company post-promotion VIP price **flagged, not invented** |
| Launch campaign (50%, 15 Cairo days) | ✅ admin-controlled, DB-clock decided, banner/badges/countdown/detail section, live expiry; **not activated** |
| Dynamic forms | ✅ 64 distinct forms, 666/666 source items covered, new repeater field, 254 inputs flagged pending legal review |
| Admin | ✅ list filters, launch pricing + add-on editor, form builder (repeaters, review flag), campaign page, import status |
| Tests | unit 97 · integration 165 · E2E see report · typecheck/lint clean · production build OK · fresh-DB proof + `db diff` clean |
| Awaiting decisions | company VIP after launch · rounding policy · legal review of flagged fields and English copy · confirm 3 reused services · approval to apply to hosted Supabase / deploy |

---

# Progress report — milestone 1 (2026-10-14)

Scope reached: Phase 0, Phase 1, Phase 2 (complete contract-order workflow), most of Phase 3 (written + video consultations) and most of Phase 4 (administration). Everything runs locally against a real Supabase stack (Postgres 17, Auth, Storage, Realtime in Docker).

## Implemented and verified

Verified = covered by an automated test that ran green on a freshly reset database (`supabase db reset` → seed → `npm run db:seed-demo`), or exercised end-to-end in a browser.

| Area | What | Evidence |
|---|---|---|
| Foundation | Nuxt 4.6 + TS strict, Pinia (session only), `@nuxtjs/i18n` (ar default RTL, `/en` LTR), `@nuxtjs/supabase` SSR cookies, Khairah DS tokens + `kh-*` classes re-themed to Oqoudi, Ui* primitives, three layouts | `nuxi typecheck` 0 errors, ESLint clean, responsive E2E |
| Database | 16 migrations: identity, catalog, immutable form versions, orders + events, documents, consultations (GiST exclusion), payments (+ idempotency), platform, RLS, business functions, function-privilege lockdown | `privileges.test.ts` (RLS on every table, no business function executable by `anon`/`authenticated`, no client write grants, private bucket without policies) |
| Auth | Register (individual/company) with **email verification**, login, unconfirmed-email resend, forgot/reset password, logout, role-aware middleware; signup can never grant privileged roles | E2E `contract-order.spec.ts` (real confirmation link from local mail catcher), `privileges.test.ts` |
| Public site | Home, directory (+ URL filters, skeleton, empty state), service detail (DB sections, add-ons, reviews, JSON-LD), about, FAQ (FAQPage JSON-LD), contact (rate-limited + honeypot), all SSR | E2E + responsive E2E (9 pages × desktop/mobile, no horizontal overflow) |
| Dynamic forms | Shared zod schema renders + validates client and server; staged secure uploads | unit `formSchema.test.ts`; integration "server re-validates"; E2E form errors + upload |
| Orders | Server-priced creation with service/add-on/form-version snapshots | `booking-and-catalog.test.ts` (price change doesn't touch old orders; stale form version rejected; foreign add-on rejected) |
| Payments (manual verification, demo mode) | InstaPay / Vodafone Cash / PayPal transfer → proof upload (private bucket, magic-byte check) → `pending_review` → admin approve (paid + `in_progress` + lawyer assigned) / reject (blocked, limited resubmission). Global toast system. Replaces the gateway simulator (2026-10-15) — see `docs/payments/manual-payment-implementation.md` | `payments.test.ts` (21 tests: lifecycle, concurrency, wrong order, attempt cap, RLS/role/storage security, old-gateway bypass, immutability, demo revenue exclusion); `manualPayments.test.ts`, `toast.test.ts`; E2E approve + reject + invalid files |
| Lifecycle | Review → info request → customer reply → in progress → deliver v1 → revision → v2 (v1 kept) → accept → review (once) ; illegal transitions rejected; full ordered history | `lifecycle.test.ts`; E2E `delivery-acceptance.spec.ts` (lawyer UI delivers, customer UI downloads, accepts, rates) |
| Documents | Private bucket, random paths, server-streamed downloads (60 s signed URL server-side, RFC 5987 Arabic filenames); unpublished deliverables hidden from customers | `isolation.test.ts`, `lifecycle.test.ts`, E2E download filename |
| Isolation / IDOR | Customer B can't read/act on A's orders, events, messages, payments, documents (API, REST, storage direct, signed URL); unassigned lawyer denied; lawyers can't see payments/audit/private settings or use admin actions | `isolation.test.ts` |
| Video consultations | Cairo-time slot generation from working hours/blocked dates, 15-min holds, concurrency-safe booking, confirmation on payment, Meet link validation (server + DB), reschedule ≥ 24 h, completion | `booking-and-catalog.test.ts` (concurrent double-booking → exactly one 409) ; agent browser checks |
| Written consultations | Lawyer answer (+ attachments) → delivered → customer reads/accepts/rates | agent browser checks; demo data |
| Client portal | Overview (actions, active orders, next meeting, notifications), orders (tabs), order detail (all states incl. privacy screen), appointments, payments, notifications (read/unread, realtime badge) | agent Playwright checks; `responsive.spec.ts` |
| Lawyer dashboard | KPIs (revenue admin-only), requests table + filters + overdue, request detail (deliverables, written reply, meeting link, messages, internal notes, answers, attachments, timeline), admin quote/assign/cancel, week calendar | agent Playwright checks; `delivery-acceptance.spec.ts` |
| Administration | Service list; editor (basics → pricing/add-ons → sections → form builder with live preview → publish with new immutable form version); pricing table; payments; reviews + replies; settings (contact, hours, blocked dates, booking params, default lawyer, users & roles) — all audited | agent API + browser checks (lawyer 403 on all admin endpoints; v1 retired / v2 published) |
| Notifications | DB-backed, i18n-rendered, Realtime subscription scoped to the user | lifecycle test asserts notification rows; portal badge |

Test totals (last run, fresh DB): **unit 24/24 · integration 35/35 · E2E 26 passed, 1 skipped (mobile-only check on desktop)**.

## Implemented but not fully verified
- Password-reset email flow (pages + Supabase calls built; not covered by an automated test).
- English translations of admin/dashboard copy (complete keys, not proofread by a native speaker).
- Realtime notification push (subscription wiring built; asserted only via data, not with two live browsers).
- Booking hold expiry → re-acquire on payment, and "paid but slot lost" conflict path (implemented in SQL; no dedicated test).
- Admin cancel of a paid order creates a refund *request* (no refund processing yet).

## Mocked for development
- **Payments are demo mode** (`PAYMENT_MODE=manual_demo`): real database workflow, but every submission/approval is flagged demo, excluded from revenue, and customers are told not to transfer. The gateway simulator was removed on 2026-10-15.
- Demo accounts and demo orders (`supabase/seed.sql`, `scripts/seed-demo.ts`) — fictional data, local only.

## Blocked (needs credentials / decisions)
| Item | Needed |
|---|---|
| Hosted Supabase project | project URL, publishable key, secret key, DB password (`supabase link`, `db push`), SMTP settings for auth emails |
| Manual payments go-live | PayPal receiving account; approval to apply migrations `20261015000100`/`…0200` to hosted Supabase; live-mode review (PayPal currency/fees, refunds, revenue reporting) |
| Email / SMS / WhatsApp notifications | provider choice + credentials (adapter boundary only) |
| Deployment target | hosting choice (Node server needed for Nitro routes) |

## Not started
- Refund processing through the provider; receipts as printable documents / tax e-invoicing.
- Company account member management UI (schema supports it).
- Lawyer profile editing, notification preferences (settings tabs present in prototype).
- Google Calendar automatic Meet creation (out of scope by request; `meeting_provider` boundary exists).
- Antivirus / content sniffing of uploads; orphaned staged-upload cleanup job.
- Sitemap, image optimisation (cover is a 2.8 MB PNG), Lighthouse/a11y audit, distributed rate limiting (current limiter is in-memory per instance).

## Notable fixes found by testing
1. Business functions were executable by `anon`/`authenticated` despite `ALTER DEFAULT PRIVILEGES` (Supabase default ACLs) → explicit lockdown migration + permanent test.
2. `order_create` enum cast bug → fix migration.
3. Supabase Storage double-encodes non-ASCII download names → server-streamed downloads with RFC 5987 header.
4. Root-hoisted `h3@2` broke `@nuxtjs/supabase` SSR → pinned `h3@1`.
5. Windows reserves ports 54292–54391 → local Supabase moved to 553xx.
6. Vue scoped `:global([dir='rtl']) .x` compiles to a bare `[dir='rtl']` rule → toast/panel transforms hit `<html>` (24 px overflow) → replaced with `--dir-sign` variables.
7. A proof pending on an order the customer cancelled could be neither approved nor rejected → rejection now allowed, approval refused (test added).

## Changed / added files (high level)
- `supabase/` — `config.toml`, 18 migrations, `seed.sql`
- `shared/` — domain (form schema, statuses, money, uploads, validators, errors, section schemas, service admin schema), generated DB types
- `server/` — utils (auth, errors, validation, rate limit), services (documents, payments: manual + admin review), 40+ API routes (orders, uploads, documents, manual payments, contact, admin, reviews)
- `app/` — 32 pages, ~90 components (ui, layout, home, services, forms, checkout, booking, orders, account, dashboard, admin), composables, repositories, Pinia session store, plugins (session, realtime)
- `i18n/locales/{ar,en}.json`, `tests/{unit,integration,e2e}`, `scripts/` (screenshots, i18n merge, demo seed), `docs/`
