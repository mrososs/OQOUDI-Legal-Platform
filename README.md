# OQOUDI (عقودي)

Egyptian legal-services platform — public website, client portal and lawyer/admin dashboard in one Nuxt 4 application backed by Supabase (Postgres, Auth, Storage, Realtime). Arabic (RTL) first, English second.

- Architecture & decisions: [`docs/architecture.md`](docs/architecture.md)
- Database: [`docs/database-schema.md`](docs/database-schema.md)
- Permissions: [`docs/permissions-matrix.md`](docs/permissions-matrix.md)
- Integrations & credentials: [`docs/integrations.md`](docs/integrations.md)
- Plan / screen map: [`docs/implementation-plan.md`](docs/implementation-plan.md)
- Status: [`docs/progress.md`](docs/progress.md)
- Visual reference (Claude Design export): [`design-reference/`](design-reference/)

## Requirements
Node 24, Docker Desktop (for the local Supabase stack).

## Run locally
```bash
npm install
npm run db:start          # local Supabase on ports 553xx (see supabase/config.toml)
cp .env.example .env      # fill SUPABASE_KEY / SUPABASE_SECRET_KEY from the db:start output
npm run dev               # http://localhost:3000  (English: /en)
npm run db:seed-demo      # optional: demo orders in every state (needs the dev server)
```
Local services: Studio http://127.0.0.1:55323 · emails (confirmation / reset) http://127.0.0.1:55324.

> Ports moved from Supabase's default 543xx because Windows/Hyper-V reserves 54292–54391 on this machine.

### Demo accounts (local seed only — password `Oqoudi123`)
| Email | Role |
|---|---|
| admin@oqoudi.test | platform admin |
| karim@oqoudi.test | lawyer (default assignee) |
| sara@oqoudi.test | lawyer (used to prove unassigned access is denied) |
| ahmed@oqoudi.test | customer (individual) |
| mona@oqoudi.test | customer (individual) |
| nile@oqoudi.test | customer (company) |

### Payments (manual verification, demo mode)
Customers pay by InstaPay, Vodafone Cash or PayPal transfer, upload a proof image to a private bucket, and an admin approves or rejects it in **Dashboard → Payments**. Only an approval marks the order paid and starts work. `PAYMENT_MODE=manual_demo` (default) labels every submission and approval as a demo and excludes it from revenue. Details: `docs/payments/manual-payment-implementation.md`.

### Contract catalog (64 contracts) and launch campaign
The client's three workbooks are the source of truth for contract names, prices, forms and documents. They are turned into a repeatable, idempotent database migration — see [`docs/catalog-import/implementation-report.md`](docs/catalog-import/implementation-report.md) and [`scripts/catalog-import/SPEC-AUTHORING.md`](scripts/catalog-import/SPEC-AUTHORING.md).
The 50% launch offer (15 Cairo days) is **disabled until an admin enables it** at *Dashboard → Launch campaign*; it never starts on deployment.

## Scripts
| Script | Purpose |
|---|---|
| `npm run catalog:extract -- --consolidated <xlsx> --individuals <xlsx> --companies <xlsx>` | read the workbooks → `data/source/*.json` (stops on any price conflict) |
| `npm run catalog:validate` | validate the 64 form specs (every source item covered) |
| `npm run catalog:build` / `catalog:check` | generate / check the data migration `…174500_catalog_contracts_data.sql` |
| `npm run catalog:verify` | source → database check of all 64 contracts (read-only; `-- --http http://localhost:3000` adds the detail routes) |
| `npm run catalog:report` | regenerate the data-derived reports in `docs/catalog-import/` |
| `npm run dev` / `build` / `preview` | Nuxt |
| `npm run typecheck` / `lint` | vue-tsc / ESLint |
| `npm run db:start` / `db:stop` / `db:reset` | local Supabase (reset re-applies migrations + seed) |
| `npm run db:types` | regenerate `shared/types/database.types.ts` |
| `npm run db:seed-demo` | demo orders through the real APIs |
| `npm test` | unit tests (Vitest) |
| `npm run test:integration` | security/workflow tests against local Supabase + dev server |
| `npm run test:e2e` | Playwright journeys (dev server + local Supabase) |

## Security model in one paragraph
Browsers read data with the publishable key under Row Level Security. Every mutation goes to a Nitro route that validates the session JWT and the input (zod, shared with the client), then calls a `SECURITY DEFINER` SQL function with the service-role key, passing the actor id; the function re-checks role/membership/assignment and the status transition and writes history + notifications atomically. Business functions are not executable by `anon`/`authenticated`. Documents live in a private bucket with no client storage policies; access is via short-lived signed URLs issued only after an RLS-scoped lookup. Orders become paid only through an admin approval of a manual payment proof (row-locked, idempotent, audited).
