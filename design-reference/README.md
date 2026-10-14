# Handoff: Oqoudi (عقودي) — Egyptian legal services platform

## Overview
Oqoudi is an Arabic, RTL-first platform where clients buy legal services (contract drafting/review, legal notices, company formation, written and video consultations), pay online, and track their order until a lawyer delivers. It has three connected experiences on one shared data model:

1. **Public website** — marketing, service directory, service detail, multi-step request + payment.
2. **Client portal** — orders, order detail, deliverables, messages, appointments, payments, notifications.
3. **Lawyer dashboard** — request queue, request handling (deliver files, written reply, meeting link), calendar, service + form builder, pricing, payments, reviews, settings.

## About the design files
The files in this bundle are **design references built in HTML** — working prototypes showing intended look and behavior, not production code. Recreate them in the target codebase's environment (React/Next.js, Vue, etc.) using its own patterns. If no codebase exists yet, a good default is **Next.js (App Router) + TypeScript + Tailwind or CSS Modules**, with the tokens below mapped to CSS variables.

`.dc.html` files are self-contained "Design Components": markup is in the `<x-dc>` body with `{{ }}` template holes, and logic is in the `<script data-dc-script>` class at the bottom (`renderVals()` = view model). Read them as component specs. Open any file directly in a browser (served over a local static server, e.g. `npx serve .`) to click through.

## Fidelity
**High-fidelity.** Final colors, type, spacing, copy and interactions. Recreate pixel-accurately. All copy is final Arabic — keep it verbatim.

## Files
- `Public Website.dc.html` — public site (hash routes below)
- `Client Portal.dc.html` — client account
- `Lawyer Dashboard.dc.html` — lawyer/admin dashboard
- `Overview.dc.html` — index page linking all three
- `Oqoudi Screens Deck.dc.html` — 51-slide Arabic stakeholder deck of every screen (uses `deck-stage.js`)
- `dq-store.js` — **the data model + all business actions** (seed data, status machine, validation, slot generation, form-field view models). Treat as the backend spec.
- `support.js` — runtime for `.dc.html` files (prototype only, do not port)
- `_ds/khairah-holding-design-system-…/` — base design system (components + tokens). Oqoudi re-themes it, see Tokens.
- `assets/` — logos and cover art
- `screens/` — desktop screenshots of every screen (`NN-pub|cli|law.png`)

## Routes (hash-based in prototype → real routes in app)
**Public website:** `#/` home · `#/services/<cat|all>` directory (cats: `individuals`, `companies`, `consultations`) · `#/service/<serviceId>` detail · `#/request/<serviceId>` request flow · `#/confirm/<orderId>` payment confirmation · `#/about` · `#/faq` · `#/contact` · `#/auth` login/register

**Client portal:** `#/overview` · `#/orders` (tabs: active / completed / all) · `#/order/<orderId>` (tabs: documents, messages, timeline, details) · `#/appointments` · `#/payments` · `#/notifications`

**Lawyer dashboard:** `#/overview` (KPIs + attention queue) · `#/requests` (filterable table) · `#/request/<orderId>` · `#/calendar` · `#/services` · `#/service/<id|new>` editor (tabs: basics, pricing, sections, form builder) · `#/pricing` · `#/payments` · `#/reviews` · `#/settings` (tabs incl. working hours, blocked dates)

## Data model (from `dq-store.js`)
- **Service**: `id, cat, cats[], kind?('written'|'meeting'), title, short, price, priceType('fixed'|'quote'), days, status('published'|'draft'), formVersion, featured, sections[{key,on}], content{about,who[],included[],deliverables[],docs[],steps[],faq[[q,a]]}, addons[{id,label,price}]`
- **Form fields** per service: `{id, type, label, placeholder, required, help, options?, minLength?, min?, accept?, maxMB?, maxFiles?}`; types: `section, help, text, textarea, number, date, select, radio, checkbox, multiselect, file`. Orders store `formVersion` used at submission.
- **Order**: `id('DQ-#####'), client, service, status, pay, total, created, formVersion, lawyer, answers[[label,value]], files[], addons[], deliverables[{v,name,size,at,note}], messages[{from,text,files,at}], timeline[{at,label,by,detail}], notes[] (lawyer-only), meeting?{date,time,link}, response?{text,files,at,by}, rating?`
- **Review**, **Notification** (`to: 'client'|'admin'`), **Settings** (`hours[[day,open,from,to]]`, `blocked[]`, `blockedSlots{date:[times]}`).

### Service status (separate from payment status)
`new` → `awaiting_payment` → `under_review` ⇄ `awaiting_info` → `in_progress` ⇄ `revision` → `delivered` → `completed`; any → `cancelled`. Client-facing labels and hints are in `STATUS` (each has `label`, `client`, `tone`, `hint`, `action`).
Progress stepper: الدفع → المراجعة → التنفيذ → التسليم → الاكتمال (`FLOW`, `FLOW_IDX`).
### Payment status
`unpaid`, `failed`, `paid`, `refunded`, `partial_refund` (`PAY`).

### Key behaviors (implement server-side)
- `quote`-priced services create order as `new` (no payment) and notify admin; fixed-price go to `awaiting_payment`.
- Pay success → `paid` + `under_review`, assign lawyer, receipt number, notify both sides. Failure → `failed`, retry available.
- Deliver → new version number, status `delivered`; client can **accept** (→ `completed`) or **request revision** (→ `revision`, message logged).
- Client message while `awaiting_info` → back to `under_review`.
- Meeting link must match `^https://meet.google.com/[a-z]{3}-[a-z]{4}-[a-z]{3}$`; setting it moves status to `in_progress` and notifies client.
- Video slots: 30 min, generated from working hours (Sat=0…Fri=6), excluding blocked days/slots and already-booked times. Timezone **Africa/Cairo**.
- Reschedule allowed by client up to 24h before. Cancel of paid order → `refunded`.
- Every action appends a timeline entry and a notification.
- File uploads: allowed extensions per field, max size (default 10 MB), max count; Arabic error messages in `fieldVM`.

## Formatting
- All UI `dir="rtl" lang="ar"`.
- Numbers in Arabic-Indic digits (`Intl.NumberFormat('ar-EG')`), currency suffix `ج.م` (e.g. `٢٬٥٠٠ ج.م`).
- Dates via `Intl.DateTimeFormat('ar-EG', {timeZone:'Africa/Cairo'})`; times as `h:mm ص/م`.

## Design tokens (Oqoudi theme over the Khairah base system)
The base DS (`_ds/…/tokens/*.css`, components in `_ds_bundle.js`: Button, IconButton, Badge, Tag, Card, Input, Select, PillNav, Logo, SplitSection; classes in `components.css`, e.g. `kh-card`, `kh-field`) supplies structure, radii, spacing and motion. Each Oqoudi page overrides colors and fonts in `:root`:

**Colors**
- Ink (primary): `--ink-900 #1C2D4A`, `--ink-800 #253A5C`, `--ink-700 #34496B`; footer `#15233B`
- Gold (accent): `50 #F7F0E4`, `100 #EFE2CB`, `200 #E3CFAB`, `300 #D2B583`, `400 #B8935A`, `500 #A07C46`, `600 #85663A`, `700 #66502F`
- Cream: `--cream-50 #FBF6EC`, `--cream-100 #E9D5B5`
- Neutrals (warm): `50 #FAF7F1`, `100 #F3EEE4`, `200 #E7E0D2`, `300 #D5CCBA`, `400 #A79E8C`, `500 #6E6858`, `600 #565042`, `700 #3D3A33`
- Status: positive `#3A6E53`/`#E3EEE6`, caution `#8A6420`/`#F6EBD6`, critical `#9A3F37`/`#F4E1DE`
- Semantic: page `#FAF7F1`, nav track `#EFE6D6`, text-strong `#1C2D4A`, body `#3A4356`, muted `#6E6858`, subtle `#A79E8C`, accent text/links `#85663A` (hover `#1C2D4A`), primary button `#1C2D4A` (hover `#15233B`, active `#0F1A2E`), button text `#F3E6CF`, focus ring `rgba(184,147,90,.5)`

**Type**
- Headings/display: **Cairo** 600–800 (Google Fonts)
- Body/UI: **IBM Plex Sans Arabic** 400–700
- Page H1 in portal/dashboard: Cairo 800, 26px (dashboard) / `clamp(24px,3vw,32px)` (portal). Public H1s `clamp(30px,4vw,44px)`. Eyebrows 14px/600 in `#85663A`. Letter-spacing 0 for Arabic.

**Spacing / radii / shadow / motion** — from base DS: 8px rhythm; content max-width 1240px; side padding `clamp(16px,4vw,40px)`; buttons radius 8px; cards 20px; pills full. Shadows (ink-tinted): xs `0 1px 2px rgba(28,45,74,.06)`, sm `0 2px 8px …/.07`, md `0 8px 24px …/.09`, lg `0 18px 44px …/.13`. Motion 140–360ms `cubic-bezier(0.4,0,0.2,1)`, no bounce.

## Layout notes
- Public header: sticky, translucent white + blur, logo (72px) on the right (RTL), centered PillNav, ghost "تسجيل الدخول" + primary "حسابي". Collapses to hamburger on mobile.
- Portal: right sidebar 264px sticky full-height on desktop; becomes top horizontal nav on mobile.
- Dashboard: right sidebar 240px; same mobile collapse. Service editor header is sticky.
- Grids use `repeat(auto-fit,minmax(…,1fr))`; everything reflows down to ~360px.

## States to reproduce
Loading skeleton on services directory (pulse `dqpulse`), empty states for lists, inline field errors, payment failure banner with retry, toast confirmations (2.6s), modal dialogs for revise/cancel/reschedule, unread notification dot.

## Assets
- `assets/oqoudi-logo-*.png` — client-supplied logo (tight version used in header/auth)
- `assets/oqoudi-cover.png` — homepage hero art
- `assets/dar-al-qanoon-logo-*.png` — legacy, not used by Oqoudi screens
- Icons are inline stroke SVGs (Lucide style, 1.8px). Use `lucide-react` in production.

## Out of scope for the prototype (needs real integration)
Payment gateway, authentication/OTP, file storage, email/SMS notifications, Google Meet link generation, admin roles/permissions, persistence (prototype uses `localStorage` key `dq_proto_v1`).
