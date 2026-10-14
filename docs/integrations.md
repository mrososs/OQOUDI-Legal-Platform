# External integrations

| Integration | Status | Notes |
|---|---|---|
| Supabase (local) | **Working** — `supabase start` via Docker | Postgres 17, Auth (email/password, confirmation emails captured by the local mail catcher at http://127.0.0.1:54324), Storage, Realtime. |
| Supabase (hosted project) | **Blocked — no credentials** | Needs project URL, anon/publishable key, service-role/secret key, DB password for `supabase link` + `supabase db push`. Nothing in the code is local-only. |
| Payment gateway (Paymob) | **Interface + stub only** | `server/services/payments/paymob.ts` implements the `PaymentProvider` shape but throws `NOT_CONFIGURED`. Needs: API key, integration ids per method (card / mobile wallet / Fawry-kiosk), iframe id, HMAC secret, webhook URL registration. |
| Payment simulator | **Mocked for development** | `PAYMENTS_PROVIDER=simulator`. Hosted-page imitation at `/dev/payment-simulator/:paymentId`, labelled as simulator. It signs a webhook with `PAYMENTS_SIMULATOR_SECRET` (HMAC-SHA256) and posts it to the same webhook pipeline real providers use. The provider factory refuses to return the simulator when `NODE_ENV=production`. |
| Google Meet | **Manual link (as designed)** | Lawyer pastes `https://meet.google.com/xxx-xxxx-xxx`; validated by regex server + DB. Boundary for automation: `server/services/meetings/` (`MeetingProvider.createMeeting(booking)`) — only the `manual` provider exists. |
| Google Calendar auto-creation | Not started (out of scope by request) | |
| Email / SMS / WhatsApp notifications | **Not started** — adapter boundary only | In-app notifications are real (DB + Realtime). Supabase Auth emails (confirmation, reset) use the local mail catcher; production needs SMTP settings in the Supabase project. |
| E-invoicing / tax receipts | Not started | Receipts are platform receipts (`RC-xxxxx`), not tax invoices. |

## Environment variables (`.env.example`)

| Variable | Used by | Secret? |
|---|---|---|
| `SUPABASE_URL` | app + server | no |
| `SUPABASE_KEY` | browser (anon/publishable key) | no (public by design, RLS-protected) |
| `SUPABASE_SECRET_KEY` (service role) | server only (`serverSupabaseServiceRole`) | **yes — never exposed to the browser** |
| `NUXT_PUBLIC_SITE_URL` | canonical URLs, auth redirects, payment return URLs | no |
| `PAYMENTS_PROVIDER` | `simulator` \| `paymob` | no |
| `PAYMENTS_SIMULATOR_SECRET` | simulator webhook HMAC | yes (dev) |
| `PAYMOB_API_KEY`, `PAYMOB_HMAC_SECRET`, `PAYMOB_INTEGRATION_CARD`, `PAYMOB_INTEGRATION_WALLET`, `PAYMOB_INTEGRATION_KIOSK`, `PAYMOB_IFRAME_ID` | paymob adapter | yes |

## Paymob integration checklist (separate milestone)
1. Obtain sandbox credentials; register `https://<host>/api/payments/webhook/paymob` as processed-callback URL.
2. Implement `createCheckout` (auth token → order registration → payment key → iframe/redirect URL, or the newer Intention API).
3. Implement `verifyWebhook` with Paymob HMAC (concatenated fields per their docs, SHA-512).
4. Map `success`, `pending`, `is_voided`, `is_refunded` to `record_payment_result`.
5. Implement `refund` for admin refunds.
6. Run the integration test suite against sandbox.
