# OQOUDI (عقودي) — Architecture

## 1. Sources of truth

| Concern | Source |
|---|---|
| Visual design, copy, interactions | `design-reference/*.dc.html` (Claude Design export) + `design-reference/screens/*.png` |
| Business rules & data model (prototype) | `design-reference/dq-store.js` — statuses, transitions, validation, slot rules, seed content |
| Screen inventory & journeys | `Dar_Al-Qanoon_Platform_Prototype.pptx` (53 slides, 42 screens) |
| Design tokens | `design-reference/_ds/khairah/*` re-themed with the Oqoudi palette (see `app/assets/css/tokens.css`) |

The prototype is a client-only mock (localStorage). Everything in `dq-store.js` that mutates state is re-implemented server-side.

## 2. System overview

```
Browser (Nuxt SSR + hydration, ar/RTL default, en/LTR)
   │  reads (RLS-protected)            │ mutations (JSON)
   ▼                                    ▼
Supabase PostgREST  ◄──────────  Nitro server routes (/api/**)
   │  RLS policies                       │ 1. authenticate (JWT validated server-side)
   │                                     │ 2. validate input (zod, shared schemas)
   ▼                                     │ 3. call SECURITY DEFINER business functions
PostgreSQL ◄─────────────────────────────┘    via service-role client, passing the actor id
   ├─ business functions (transition matrix, pricing, booking, payments, notifications)
   ├─ triggers (profile bootstrap, price history, form-version immutability)
   └─ Realtime (notifications per user)
Supabase Storage (private bucket `order-documents`, no client policies; signed URLs only)
Manual payments: signed upload to private bucket → /api/orders/:id/manual-payment → admin approve/reject (/api/admin/manual-payments/:id/*)
```

### One app, three experiences
A single Nuxt 4 application with three layouts:

| Experience | Route prefix | Layout | Access |
|---|---|---|---|
| Public website | `/`, `/services`, `/service/*`, `/checkout/*`, `/about`, `/faq`, `/contact`, `/auth/*` | `default` | anyone (checkout requires login) |
| Client portal | `/account/**` | `client` | authenticated |
| Lawyer/admin dashboard | `/dashboard/**` | `lawyer` | role `lawyer` or `admin`; some pages `admin` only |

English versions live under `/en/...` (`@nuxtjs/i18n`, strategy `prefix_except_default`, Arabic default, `dir` switches with locale).

## 3. Key decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Nuxt 4 + `@nuxtjs/supabase`** (cookie-based SSR sessions) | Official, maintained module; SSR session + `serverSupabaseUser` JWT validation out of the box. Module redirect disabled — we use our own role-aware middleware. |
| D2 | **Reads via RLS, writes via server** | Simple lists/details read directly with the user's Supabase client (no redundant API layer). Every mutation goes through a Nitro route → `SECURITY DEFINER` SQL function. Tables expose **no INSERT/UPDATE/DELETE** policies to `authenticated` for workflow tables. |
| D3 | **Business functions take an explicit `p_actor` and are executable only by `service_role`** | The server is the trust boundary (input validation incl. dynamic forms happens in TS with zod). The SQL function re-checks role/membership/assignment and transition legality (defence in depth) and performs all side effects (events, notifications) atomically in one transaction. |
| D4 | **Roles separate from account type** | `user_roles(customer/lawyer/admin)` vs `customer_accounts.kind(individual/company)`. Signup trigger only ever grants `customer`. Privileged roles granted by admin via server route (audited). |
| D5 | **Customer accounts with members** | Orders belong to a `customer_account`; access = membership. Today each user owns one account; companies can add members later without schema change. |
| D6 | **Lawyers see only assigned orders**; admins see all | Least privilege for confidential legal data. Assignment happens on payment approval (auto: default/least-loaded lawyer) or by admin. |
| D7 | **Form versions are immutable JSON documents** | `service_form_versions.schema` holds the ordered field list (incl. section headers), validated by one shared zod schema that also drives rendering and server validation. Publishing creates a new version; a trigger blocks edits to published versions. Orders reference the exact version → historical orders never change. Replaces the proposed `service_form_sections/fields` tables (which would require copying rows per version). |
| D8 | **Order snapshots** | `orders.service_snapshot` (title, kind, pricing type, base price, delivery estimate) + `order_addons` (title/price copies) + `form_version_id`. Service edits never alter historical orders. `service_price_history` written by trigger. |
| D9 | **Money = `bigint` minor units (piasters)** | Paymob works in cents; no float rounding. Formatting `ar-EG` → `٢٬٥٠٠ ج.م`. |
| D10 | **Status ≠ payment status** | `order_status` and `payment_status` enums, both only changed inside SQL functions. Transition matrix lives in SQL (enforced) and mirrored in `shared/domain/orderStatus.ts` (UI hints only). |
| D11 | **Durable timeline** | `order_events` (type, from/to status, actor, details, visibility) is both the status history and the client/lawyer timeline. |
| D12 | **Documents: staged direct uploads** | Client requests a signed *upload* URL from the server (validated type/size/ownership) → uploads directly to private storage under `docs/<uuid>` → server verifies object & marks ready → order submission attaches document ids after validating them against the form field rules. Downloads: RLS-scoped lookup of the `documents` row, then the server streams the object using a 60 s signed URL that never leaves the server (Storage double-encodes non-ASCII names in its own `Content-Disposition`, so Arabic filenames require our RFC 5987 header). The bucket has **no** storage policies for `anon`/`authenticated`. |
| D13 | **Concurrency-safe bookings** | `consultation_bookings` has a GiST exclusion constraint on `tstzrange(starts_at, ends_at)` for `held/confirmed` rows. Slots are held (15 min) at order creation, extended (≤ 48 h) while a payment proof is reviewed; approval confirms. Canonical timestamps in UTC; slot generation uses `Africa/Cairo` wall-clock in SQL (`AT TIME ZONE`) so DST is handled by Postgres tzdata. |
| D14 | **Manual payment verification** | Gateway replaced by transfer + proof + admin review (`manual_payment_submissions`, own `manual_verification_status`). Only `manual_payment_approve` (admin, row-locked) marks an order paid; decisions and audit rows are immutable. Demo mode is server-controlled (`PAYMENT_MODE`). See `docs/payments/manual-payment-implementation.md`. |
| D15 | **No Tailwind** | The existing system is CSS custom properties + `kh-*` classes. We port tokens/classes verbatim and use scoped CSS in SFCs. Adding Tailwind would duplicate the token system. |
| D16 | **Pinia only for session state** | `useSessionStore` (user, profile, roles). Everything else is page/composable-local (`useAsyncData`). Filters live in the URL query. |
| D17 | **No `v-html`** | All user/admin text is rendered as text (`white-space: pre-line`). No rich text editor yet → no sanitizer needed. |
| D18 | **Localized catalog content as `jsonb {ar, en}`** | Services, sections, add-ons, form labels, FAQs. `ar` is required, `en` optional (falls back to Arabic). |

## 4. Code layout

```
app/                      Nuxt 4 srcDir
  assets/css/             tokens.css (Oqoudi theme), base.css, components.css (kh-* classes)
  components/ui/          Ui* primitives ported from the DS (Button, Input, Select, PillNav, Badge…)
  components/<feature>/   services, forms, orders, account, dashboard, layout
  composables/            useFormat, useLocalized, useApi, useToast, use<Feature>
  layouts/                default (public), client (portal), lawyer (dashboard)
  middleware/             auth, guest, staff, admin (navigation UX only — security is RLS + server)
  pages/                  file routes (see implementation-plan.md screen map)
  stores/                 session.ts (Pinia)
server/
  api/                    route handlers (thin: auth → validate → service)
  services/               orders, documents, payments/{manual,adminReview}
  utils/                  supabase admin client, auth guards, errors, rate limit
shared/                   imported by app + server (Nuxt 4 `shared/` dir)
  types/database.types.ts generated by `npm run db:types`
  domain/                 order status matrix, money, form schema + validation (zod), slots
supabase/
  migrations/             ordered SQL migrations
  seed.sql                demo catalog + demo users (no real client data)
tests/unit|integration|e2e
docs/
```

## 5. Request lifecycle example — "customer accepts a delivery"

1. `POST /api/orders/:id/accept` (cookie session).
2. `requireUser(event)` validates the JWT with Supabase Auth.
3. Body validated with zod.
4. `rpc('order_accept_delivery', { p_actor: user.id, p_order: id })` via service-role client.
5. SQL: lock order row (`FOR UPDATE`), check actor is a member of the order's customer account, check `status = 'delivered'`, set `completed`, insert `order_events`, insert notifications for assigned lawyer.
6. Errors are raised with stable codes (`OQ403`, `OQ409_TRANSITION`, …) and mapped to HTTP status + i18n message keys.
