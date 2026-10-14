# Implementation plan

## Screen → route map (42 prototype screens)

### Public website (16)
| # | Screen | Route | Notes |
|---|---|---|---|
| 01–03 | Home: cover, search & categories, services & consultations | `/` | SSR; featured services, categories, reviews, FAQ from DB |
| 04–06 | Directories (individuals / companies / consultations) | `/services`, `/services/[category]` | search `?q=`, price filter `?price=`, sort `?sort=` in URL |
| 07–08 | Service detail + sections | `/service/[slug]` | SSR + SEO meta; sections/addons from DB |
| 09 | Service request form | `/service/[slug]/request` | dynamic form from published form version |
| 10 | Video consultation booking | `/service/video-consultation/request` | adds slot step |
| 11 | Written consultation | `/service/written-consultation/request` | same flow, written kind |
| 12 | Payment confirmation | `/checkout/[orderNumber]` (pay step), `/checkout/[orderNumber]/confirmation` | confirmation polls server status |
| 13 | About | `/about` | `content_pages` |
| 14 | FAQ | `/faq` | `faq_entries` |
| 15 | Contact | `/contact` | `POST /api/contact` (rate limited) |
| 16 | Login / register | `/auth/login`, `/auth/register` (+ `/auth/forgot-password`, `/auth/reset-password`, `/auth/confirm`) | |

### Client portal (11)
| # | Screen | Route |
|---|---|---|
| 01 | Overview | `/account` |
| 02 | My orders (active/completed/all) | `/account/orders?tab=` |
| 03–07 | Order detail: delivery, meeting, written consultation, failed payment, completed+rated | `/account/orders/[orderNumber]?tab=` (states of one page) |
| 08 | Appointments | `/account/appointments` |
| 09 | Payments & receipts | `/account/payments` |
| 10 | Notifications | `/account/notifications` |
| 11 | Privacy protection (other customer's order) | same order route → "not available" state (RLS returns nothing) |

### Lawyer / admin dashboard (15)
| # | Screen | Route | Role |
|---|---|---|---|
| 01 | Overview KPIs + attention queue | `/dashboard` | lawyer (own), admin (all + revenue) |
| 02 | Requests table | `/dashboard/requests` | lawyer, admin |
| 03–05 | Request detail: deliver, meeting link, written answer | `/dashboard/requests/[orderNumber]` | assigned lawyer, admin |
| 06 | Consultation calendar | `/dashboard/calendar` | lawyer, admin |
| 07 | Services list | `/dashboard/services` | admin |
| 08–11 | Service editor: basics, pricing, sections, form builder | `/dashboard/services/[id]?tab=` | admin |
| 12 | Pricing table | `/dashboard/pricing` | admin |
| 13 | Payments | `/dashboard/payments` | admin |
| 14 | Reviews | `/dashboard/reviews` | lawyer (reply on own), admin |
| 15 | Settings (platform, hours, blocked dates, users & roles) | `/dashboard/settings?tab=` | admin |

## Phases & checklist

Legend: ☑ done & verified · ◐ done, not fully verified · ☐ not started

Legend for current state: see docs/progress.md for evidence.

### Phase 0 — Audit & architecture
- ☑ Prototype + DS + deck audited; prototype copied to `design-reference/`
- ☑ `docs/architecture.md`, `permissions-matrix.md`, `integrations.md`, this plan
- ☑ `docs/database-schema.md`

### Phase 1 — Foundation
- ☑ Nuxt 4 + TS + ESLint + Pinia + i18n (ar default / en) + Supabase module
- ☑ DS tokens/classes + Ui primitives (Button, Input, Select, Textarea, PillNav, Badge, IconButton, Card, Alert, Modal, Toast, Skeleton, EmptyState)
- ☑ Layouts: public / client / lawyer (responsive collapse)
- ☑ Supabase local config, migrations, baseline RLS, roles, seed
- ☑ Auth: register (individual/company), login, verify email, forgot/reset, logout
- ☑ Route middleware (auth / guest / staff / admin) + server guards
- ☑ Generated DB types

### Phase 2 — Contract-drafting order end-to-end
- ☑ Public catalog from DB (home, directory, detail)
- ☑ Dynamic request form rendered from published form version; shared validation
- ☑ Staged secure uploads
- ☑ Order creation (server-priced, snapshots)
- ☑ Checkout through provider adapter (simulator) + webhook + idempotency
- ☑ Confirmation page (server status)
- ☑ Lawyer: requests list + detail, status changes, request info, messages, notes
- ☑ Deliverable upload with versions
- ☑ Customer: notifications, download, accept / request revision
- ☑ Review on completed order
- ☑ Admin service editor (basics → pricing → sections → form builder → publish)

### Phase 3 — Consultations
- ☑ Written consultation answer workflow
- ☑ Availability rules / blocked dates, slot generation (Cairo TZ), hold + confirm
- ☑ Lawyer calendar, manual Meet link publish, reschedule, complete

### Phase 4 — Administration
- ◐ Assignment, payments dashboard, reviews + replies, pricing table, settings, users & roles ☑ — refund processing ☐

### Phase 5 — Production readiness
- ☐ SEO (sitemap, structured data), a11y audit, responsive QA, performance
- ☐ Paymob adapter (needs credentials), hosted Supabase (needs credentials), deployment
