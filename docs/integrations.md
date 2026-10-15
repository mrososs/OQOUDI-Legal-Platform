# External integrations

| Integration | Status | Notes |
|---|---|---|
| Supabase (local) | **Working** — `supabase start` via Docker | Postgres 17, Auth (email/password, confirmation emails captured by the local mail catcher at http://127.0.0.1:54324), Storage, Realtime. |
| Supabase (hosted project) | **Blocked — no credentials** | Needs project URL, anon/publishable key, service-role/secret key, DB password for `supabase link` + `supabase db push`. Nothing in the code is local-only. |
| Manual payments (InstaPay / Vodafone Cash / PayPal) | **Implemented — demo mode** | Transfer + proof upload + admin approval. See `docs/payments/manual-payment-implementation.md`. Destinations live in `platform_settings['payments.manual']` (Dashboard → Settings → الدفع). InstaPay/Vodafone Cash: client number configured; PayPal account pending. `PAYMENT_MODE=manual_demo` labels everything as demo and keeps it out of revenue. |
| Payment gateway (Paymob) / simulator | **Removed** | Checkout, webhook and dev-simulator routes and adapters were removed when the manual flow replaced them; `payment_start` is retired (`OQ410_GATEWAY_RETIRED`). Historical rows are kept. A future gateway needs a new adapter + webhook + review. |
| Google Meet | **Manual link (as designed)** | Lawyer pastes `https://meet.google.com/xxx-xxxx-xxx`; validated by regex server + DB. Boundary for automation: `server/services/meetings/` (`MeetingProvider.createMeeting(booking)`) — only the `manual` provider exists. |
| Google Calendar auto-creation | Not started (out of scope by request) | |
| Email / SMS / WhatsApp notifications | **Not started** — adapter boundary only | In-app notifications are real (DB + Realtime). Supabase Auth emails (confirmation, reset) use the local mail catcher; production needs SMTP settings in the Supabase project. |
| E-invoicing / tax receipts | Not started | Receipts are platform receipts (`RC-xxxxx`; `DEMO-RC-xxxxx` in demo mode), not tax invoices. |

## Environment variables (`.env.example`)

| Variable | Used by | Secret? |
|---|---|---|
| `SUPABASE_URL` | app + server | no |
| `SUPABASE_KEY` | browser (anon/publishable key) | no (public by design, RLS-protected) |
| `SUPABASE_SECRET_KEY` (service role) | server only (`serverSupabaseServiceRole`) | **yes — never exposed to the browser** |
| `NUXT_PUBLIC_SITE_URL` | canonical URLs, auth redirects | no |
| `PAYMENT_MODE` | `manual_demo` (default) or `manual_live` — server-side only | no |
| `PAYMENT_LIVE_ACKNOWLEDGED` | must be `manual-live-reviewed` for `manual_live` to take effect | no |

## Paymob integration checklist (not scheduled — gateway removed in favour of manual verification)
1. Obtain sandbox credentials; register `https://<host>/api/payments/webhook/paymob` as processed-callback URL.
2. Implement `createCheckout` (auth token → order registration → payment key → iframe/redirect URL, or the newer Intention API).
3. Implement `verifyWebhook` with Paymob HMAC (concatenated fields per their docs, SHA-512).
4. Map `success`, `pending`, `is_voided`, `is_refunded` to `record_payment_result`.
5. Implement `refund` for admin refunds.
6. Run the integration test suite against sandbox.
