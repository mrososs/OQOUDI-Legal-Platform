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

### Payments in development
`PAYMENTS_PROVIDER=simulator` routes checkout to `/dev/payment-simulator/:paymentId`, a page **clearly labelled as a simulator**. Choosing an outcome makes the server emit an HMAC-signed webhook to `/api/payments/webhook/simulator` — the same verified, idempotent path a real gateway uses. The simulator is refused when `NODE_ENV=production`. Paymob is stubbed until credentials exist.

## Scripts
| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `preview` | Nuxt |
| `npm run typecheck` / `lint` | vue-tsc / ESLint |
| `npm run db:start` / `db:stop` / `db:reset` | local Supabase (reset re-applies migrations + seed) |
| `npm run db:types` | regenerate `shared/types/database.types.ts` |
| `npm run db:seed-demo` | demo orders through the real APIs |
| `npm test` | unit tests (Vitest) |
| `npm run test:integration` | security/workflow tests against local Supabase + dev server |
| `npm run test:e2e` | Playwright journeys (dev server + local Supabase) |

## Security model in one paragraph
Browsers read data with the publishable key under Row Level Security. Every mutation goes to a Nitro route that validates the session JWT and the input (zod, shared with the client), then calls a `SECURITY DEFINER` SQL function with the service-role key, passing the actor id; the function re-checks role/membership/assignment and the status transition and writes history + notifications atomically. Business functions are not executable by `anon`/`authenticated`. Documents live in a private bucket with no client storage policies; access is via short-lived signed URLs issued only after an RLS-scoped lookup. Orders become paid only through a verified, idempotent provider webhook.
