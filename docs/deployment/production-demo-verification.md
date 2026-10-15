# OQOUDI — Production Demo Verification

- **Date:** 2026-10-15
- **Live URL:** https://oqoudi-gray.vercel.app
- **Supabase project:** `dnoyswgsbcassyrfmorg`

**Method:** Chrome DevTools MCP against the live Vercel deployment, using real logins with the existing demo accounts. Results were cross-checked with read-only SQL on Supabase Cloud and the Vercel runtime logs. Nothing in this report is based on source inspection or a successful build alone.

## 1. Deployment

| Item | Value |
|---|---|
| Active production deployment | `dpl_4aeUVVBGNjVVURbgJA4zXmEBU5Be`: READY, target `production` |
| Commit | `ee8d50d` on `main` (GitHub `mrososs/OQOUDI-Legal-Platform`) |
| Build | Nuxt 4.6.1, Nitro preset `vercel`; no missing Supabase-config warnings |
| Production env vars | `SUPABASE_URL`, `SUPABASE_KEY` (sensitive), `SUPABASE_SECRET_KEY` (sensitive), `NUXT_PUBLIC_SITE_URL`. Values were not read or printed. |
| Preview env vars | Only `SUPABASE_URL` and `NUXT_PUBLIC_SITE_URL`. Preview deploys lack both keys. |
| Runtime errors, last 60 min | 1 line: a deliberate `GET /service/does-not-exist` (404). There were no Supabase errors. |

**Not yet deployed:** the three code fixes in section 7. They pass checks locally but await deployment approval.

## 2. Supabase server connection

- **Before:** `[db] roles failed { message: 'Invalid API key' }`, and `GET /api/admin/users` returned 500.
- **Now:** fixed. As admin, `GET /api/admin/users` returns 200 with 6 users whose roles match `public.user_roles`.
- **Server API routes work against Supabase Cloud:**
  - `/api/orders`
  - `/api/orders/:id/messages`
  - `/api/uploads` and `/api/uploads/:id/complete`
  - `/api/documents/:id/download` and `/api/documents/:id/file`
  - `/api/admin/users`
- **The secret key stays server-side.** It sits in the private `runtimeConfig.supabase.secretKey`, used only through `serverSupabaseServiceRole` in `server/utils/auth.ts`.
  - None of the 71 client JS chunks or the server-rendered HTML contains a key value.
  - The only `sb_secret_` text in the bundle is supabase-js's prefix check: ``e.startsWith(`sb_secret_`)``.

## 3. Results

| Area | Test | Expected | Actual | Status |
|---|---|---|---|---|
| Deploy | Latest production deployment active | READY on `main` | `dpl_4aeUVVBG…` READY, `ee8d50d` | PASS |
| Deploy | Updated env vars in use | No `Invalid API key` | Admin API returns 200; no key errors in logs after redeploy | PASS |
| Deploy | Secrets not exposed to browser | No secret in bundles or network | Clean (see section 2) | PASS |
| Auth | Customer login (Ahmed) | Lands on `/account` | Landed on `/account` on 2 of 3 tries. Once it bounced to `/auth/login?redirect=/account` (race condition, issue 2 in section 6). | FAIL (fixed locally, not deployed) |
| Auth | Lawyer login (Karim) | Lands on `/dashboard` | `/dashboard` (3 of 3) | PASS |
| Auth | Admin login | Lands on `/dashboard` with admin nav | `/dashboard` with 8 admin sections | PASS |
| Auth | Old seed password `Oqoudi123` rejected | Error, no session | Supabase returned 400 and the UI showed "البريد الإلكتروني أو كلمة المرور غير صحيحة." | PASS |
| Auth | Session survives refresh | Stays signed in | `/account` (customer) and `/dashboard/requests/DQ-10253` (admin) reload signed in | PASS |
| Auth | Logout | Session cleared | Redirects to `/`; `sb-*` cookies removed; API returns 401; `/account` sends to login | PASS |
| RBAC | Customer opens `/dashboard`, `/dashboard/settings` | Blocked | Redirected to `/account` | PASS |
| RBAC | Guest opens `/account`, `/dashboard`, the request form | Login with `redirect` | Correct `redirect` query on each | PASS |
| RBAC | `GET /api/admin/users`: admin, customer, lawyer, guest | 200, 403, 403, 401 | 200, 403, 403, 401 | PASS |
| RBAC | `POST /api/orders` as guest | 401 | 401 `OQ401` | PASS |
| RBAC | Customer B (Mona) opens customer A's order | Denied | Page shows "لا يمكنك الوصول إلى هذا الطلب"; message API returns 404 `OQ404_ORDER` | PASS |
| RBAC | Mona downloads Ahmed's document | Denied | 404 `OQ404_DOCUMENT` (`download` and `file`) | PASS |
| RBAC | Lawyer sees unassigned order | Hidden (RLS: assigned lawyer or admin only) | Hidden until the admin assigned it | PASS (by design) |
| Public | Home page | Loads, RTL, no errors | Loads; no console errors | PASS |
| Public | Individuals / companies / consultations | Database-backed service lists | 6 / 7 / 4 service links; prices from the database | PASS |
| Public | All services and search (`?q=عقد`) | Filtered list | Works | PASS |
| Public | Service details and prices | Price from database | e.g. lease ١٬٢٠٠ ج.م, video consultation ١٬٠٠٠ ج.م, drafting ٢٬٥٠٠ ج.م | PASS |
| Public | About, FAQ, Contact | Load | Load, no failed requests | PASS |
| Public | English (`/en`, `/en/services`, `/en/service/...`) | LTR, `en-US` | LTR, `en-US`, content translated | PASS |
| Public | Unknown service | 404 page | 404 page | PASS |
| Public | Mobile 390 px | No horizontal scroll | Width 390 equals scroll width; menu collapses | PASS |
| Customer | Dashboard, orders, appointments, payments, notifications | Load with real data | All load; the order appears after creation | PASS |
| Customer | Request form (`/service/written-consultation/request`) | Customer can fill and submit | **Page freezes on the first keystroke** (infinite render loop, production builds only). Reproduced 3 times. | FAIL (fixed locally, not deployed) |
| Customer | Order creation (backend) | Persisted with server-side price | Via the real `POST /api/orders` as Ahmed: `DQ-10253`, `awaiting_payment`, 750 EGP | PASS |
| Customer | Order detail page | Status, amount, timeline | Correct; "Awaiting payment", lawyer "set after payment" | PASS |
| Customer | Messages from lawyer | Visible plus a notification | Message visible in the Messages tab; notification "رسالة جديدة على الطلب DQ-10253" | PASS |
| Customer | Download attachment | Own order only | 200, 193-byte PDF | PASS |
| Customer | Video consultation booking | Slot hold and booking | Needs the request form (frozen) | NOT TESTED |
| Lawyer | Overview, requests, calendar, reviews | Load from Supabase | Load; KPIs from `rpc/dashboard_kpis` return 200 | PASS |
| Lawyer | Order detail (assigned) | Customer info, answers, log | Correct; no admin-only actions | PASS |
| Lawyer | Send message | Saved, customer notified | Saved; customer notified | PASS |
| Lawyer | Upload document to private Storage | Signed upload, ready, attached | `/api/uploads` 200 → Storage PUT → complete; document `ready`, linked to message, 1 object in `order-documents` | PASS |
| Lawyer | Deliver final document | Delivery flow | Needs a paid order (payments disabled) | BLOCKED |
| Lawyer | Mobile requests list | Usable | Table scrolls inside its card; no page overflow | PASS |
| Admin | Dashboard and all sections | Load | Requests, calendar, services, pricing, payments, reviews, settings: all load, no failed requests | PASS |
| Admin | Users (`/api/admin/users`) | 200 with roles | 6 users, roles correct | PASS |
| Admin | Service editor and form builder | Existing service and fields load | "صياغة عقد" loads with all 4 tabs; form-builder palette and saved fields shown | PASS |
| Admin | Assign order to lawyer | Persisted, lawyer notified | `assigned_lawyer_id = karim`, event and notification created | PASS |
| Admin | Saving services, pricing or settings | n/a | Not run, to avoid changing real catalog or settings data | NOT TESTED |
| Payments | Checkout | Unavailable message, nothing marked paid | "خدمة الدفع غير متاحة حاليًا. حاول لاحقًا." (503 `OQ503_PAYMENTS`); order stays `unpaid`; **0 rows in `payments`** | PASS (intentionally disabled) |
| Payments | No misleading success UI | No success screen | Stays on checkout with the alert | PASS |
| DevTools | Console errors | None critical | Only the expected 503 from checkout | PASS |

## 4. Payments

Payments are intentionally disabled. This is not a finished feature. Neither Paymob nor the simulator is enabled; the simulator is refused in production by `server/services/payments/index.ts`.

Checkout fails cleanly with a translated message, and no payment row is written. Because nothing can be paid:
- orders stay `awaiting_payment`;
- lawyers only see an order after an admin assigns it by hand;
- deliveries, revisions, completion and reviews cannot be shown in the demo.

## 5. Test data created in production

All of it is clearly labelled and disposable:
- **Order `DQ-10253`:** Ahmed, written consultation, title `[QA-TEST] …`, assigned to Karim, unpaid.
- **One message from Karim:** `[QA-TEST] رسالة تجريبية من المحامي…`
- **One message with a PDF attachment:** `QA-TEST-document.pdf` (193 bytes, in the private bucket).

No demo passwords, existing records, migrations, seed data or RLS settings were changed. The admin can cancel `DQ-10253` from the dashboard before the client demo, or keep it as sample data.

## 6. Issues found

### Issue 1: request form freezes in production (critical, fixed locally)

- **Reproduce:** sign in as a customer, open `/service/written-consultation/request`, type one character in any field. The tab stops responding.
- **Root cause (frontend):**
  - `DynamicForm.vue` passes `files[field.id] ?? []`, which is a new empty array on every render.
  - `DynamicField.vue` had a deep `watch(files)` on every field that wrote `value = files.map(id)` and emitted `update:value`.
  - Any answer change caused a re-render, which fired every field's watcher, each of which emitted, which caused another re-render, endlessly.
  - It also overwrote text answers with `[]`.
- **Why tests missed it:** Vue stops recursive updates only in development builds (`__DEV__` recursion guard), so local dev and E2E runs never froze.
- **Proof:** the same pattern run on Vue's production build in Node:
  - current code: unbounded (stopped only by the test's guard at 2,000 emits), with every answer wiped to `[]`;
  - fixed code: 0 extra emits, answer kept.
  - In the dev build, Vue's guard aborts the loop after about 300 emits.
- **Screenshot:** none. The tab freezes before anything can be captured.

### Issue 2: intermittent bounce back to login after a successful sign-in (high, fixed locally)

- **Root cause:** `@nuxtjs/supabase` fills `useSupabaseUser()` from an un-awaited `getClaims()` after `SIGNED_IN` (`supabase.client.js:64`). On Cloud this needs a JWKS fetch. `login.vue` navigated before that finished, so the `auth` middleware saw no user.

### Issue 3: lawyers never see new orders while payments are disabled (by design)

Assignment happens after payment. For the demo, an admin must assign orders manually.

### Minor issues

- **Lawyer order view:** shows the customer-facing banner "أكمل الدفع حتى يبدأ المحامي مراجعة طلبك".
- **Lawyer access-denied page:** links to "طلباتي", which is customer wording.
- **Checkout check order:** `POST /api/orders/:id/checkout` checks payment availability before order ownership. It returns 503 for any order, which reveals nothing today, but the order of checks should be reviewed when Paymob is enabled.

### Screenshots

- `docs/deployment/screenshots/checkout-payments-unavailable.jpeg`
- `docs/deployment/screenshots/customer-order-detail.jpeg`
- `docs/deployment/screenshots/lawyer-requests-mobile.jpeg`

## 7. Code fixes (local, not committed, not deployed)

| File | Change |
|---|---|
| `app/components/forms/DynamicField.vue` | Removed the deep `watch(files)`. The file list now syncs to the answer only on an actual upload or removal, through `@update:model-value="setFiles"`. |
| `app/components/forms/DynamicForm.vue` | Uses a stable `noFiles` array instead of a new `[]` on each render. |
| `app/pages/auth/login.vue` | Awaits `supabase.auth.getClaims()` and sets `useSupabaseUser()` before navigating. |

**Checks run locally on these changes:**
- `nuxt typecheck`: clean.
- `vitest` unit tests: 24 of 24 passed.
- `eslint` on the changed files: clean.
- `nuxt build`: succeeded.

E2E tests were not run, because local Supabase (Docker) is down.

## 8. Remaining blockers before sharing with the client

1. **Deploy fixes 1 and 2.** Without them customers cannot submit any request form. Then re-verify on production: fill and submit a form as a customer, and log in five times in a row without a bounce.
2. **Payments are intentionally disabled.** Paid-order flows (delivery, revision, completion, reviews) cannot be demonstrated. Either provide Paymob credentials or accept the limitation for the demo; the simulator stays off.
3. **Add `SUPABASE_KEY` and `SUPABASE_SECRET_KEY` to the Preview environment** if preview deployments will be used.
4. **Enable leaked-password protection** under Supabase Auth → Settings.
5. **Decide what to do with the `DQ-10253` QA order:** cancel it, or keep it as sample data.
