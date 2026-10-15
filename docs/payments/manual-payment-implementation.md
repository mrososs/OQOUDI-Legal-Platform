# Manual payment verification (InstaPay · Vodafone Cash · PayPal)

Status: implemented and verified locally on 2026-10-15. Migrations **applied to hosted Supabase** (`dnoyswgsbcassyrfmorg`) on 2026-10-15; **app code not yet deployed** (see §11).

The card / wallet / Fawry gateway checkout (Paymob stub + development simulator) is replaced by manual transfer verification:

```
customer order (awaiting_payment)
  → chooses InstaPay / Vodafone Cash / PayPal, sees transfer instructions
  → uploads a proof image (private bucket) → submission = pending_review
  → admin reviews in Dashboard → Payments
      approve → payment succeeded, order paid → in_progress (lawyer assigned) → customer notified
      reject  → payment failed, order stays awaiting_payment → customer notified (limited resubmission)
```

Everything runs on the real database and storage: it is not a front-end simulation.

---

## 1. Architecture

| Layer | Files |
|---|---|
| Shared rules (client + server) | `shared/domain/manualPayments.ts`: methods, statuses, 5 MB / PNG·JPG·WEBP rules, magic-byte sniffing, settings schema, customer state A/B/C/D |
| Server services | `server/services/payments/manual.ts` (mode, destinations, signed upload, object verification, signed preview) · `server/services/payments/adminReview.ts` (admin list / detail / KPIs) |
| API routes | see §4 |
| SQL | `supabase/migrations/20261015000100_manual_payment_enums.sql`, `20261015000200_manual_payments.sql` |
| Customer UI | `pages/checkout/[orderNumber]/index.vue` (5 steps), `pages/checkout/[orderNumber]/confirmation.vue` (status screen), `components/checkout/{CheckoutStep,CheckoutOrderOverview,ManualMethodPicker,TransferInstructions,ProofUpload}.vue`, `components/payments/*` (logo, demo notice, status card, proof preview, badge), `composables/useManualCheckout.ts`, `utils/sampleProof.ts` |
| Admin UI | `pages/dashboard/payments.vue` (Verification + All records tabs), `components/admin/{AdminPaymentKpis,AdminPaymentFilters,AdminManualPaymentsTable,AdminPaymentReviewPanel,AdminPaymentRecords,AdminPaymentSettings}.vue`, `composables/useAdminManualPayments.ts`, settings tab “الدفع” |
| Toasts | `composables/useToast.ts`, `components/ui/UiToaster.vue`, `components/ui/UiToastBody.vue` |
| Logos | `public/payments/{instapay.png,vodafone-cash.png,paypal.svg}` (client-supplied artwork) |

Trust boundary is unchanged: the browser reads through RLS. Every write goes through a Nitro route that checks the session, then calls a `SECURITY DEFINER` function with the service role. The function re-checks role, ownership, state and amount.

## 2. Database migrations

**`20261015000100_manual_payment_enums.sql`** adds `instapay`, `vodafone_cash` and `paypal` to `payment_method`. It is a separate file because a new enum value can't be used in the transaction that adds it. Legacy values stay for history.

**`20261015000200_manual_payments.sql`**
- `payments`: provider check now allows `manual`; new `is_demo boolean default false`.
- New enum `manual_verification_status` (`pending_review | approved | rejected`). It is separate from `payment_attempt_status`, `payment_status` and `order_status`.
- New table `manual_payment_submissions` (one row per proof, linked 1:1 to a `payments` row):
  `order_id, customer_account_id, payment_id (unique), payment_method (manual methods only), expected_amount_minor, currency, proof_storage_path (unique), proof_mime_type, proof_size_bytes (≤ 5 MB), verification_status, demo_mode, submitted_by, submitted_at, reviewed_at, reviewed_by, rejection_reason (≤ 500), created_at, updated_at`.
  - Partial unique indexes: at most **one `pending_review`** and at most **one `approved`** submission per order.
  - Check constraints: `reviewed_at` is set exactly when the submission is decided, and `rejection_reason` only appears on rejected rows.
  - Trigger `manual_payment_submissions_guard`: once a submission is decided it can't change, identity columns never change, and rows are never deleted. The one exception is the FK `on delete set null` of a removed reviewer.
- `audit_logs` became append-only (trigger `audit_logs_guard`). The FK set-null of `actor_id` is still allowed.
- RLS on submissions: `select` for admins, and for members of the order's customer account. Lawyers get nothing. No API-role writes.
- Private bucket `payment-proofs`: `public = false`, 5 MB limit, `image/png|jpeg|webp` only, **no storage policies**.
- `platform_settings['payments.manual']` (not public): destinations + `max_attempts` (default 3). It is seeded with the client-provided number `01006816005` for InstaPay and Vodafone Cash, and an empty PayPal account (still waiting for one). `on conflict do nothing`, so an admin's later edits are never overwritten.
- Functions (service_role only): `manual_payment_submit`, `manual_payment_approve`, `manual_payment_reject`, plus private helpers.
- `payment_start` is **retired**: it now raises `OQ410_GATEWAY_RETIRED`.
- `dashboard_kpis` revenue now excludes `is_demo` payments.
- Explicit revoke/grant for every new function (privileges test enforces it).

Generated types: `shared/types/database.types.ts` was regenerated with `supabase gen types --local`.

## 3. State transitions

| Event | submission | payments row | orders.payment_status | orders.status |
|---|---|---|---|---|
| Proof submitted | `pending_review` | new `manual` row, `pending` | unchanged (`unpaid`/`failed`) | stays `awaiting_payment` |
| Approved | `approved` | `succeeded`, receipt `DEMO-RC-n` (demo) / `RC-n` | `paid` | `in_progress` when a lawyer is (or can be) assigned. Otherwise `under_review`, and admins are notified `order.unassigned` |
| Rejected | `rejected` (+ reason) | `failed` (`manual_review_rejected`) | `failed` | stays `awaiting_payment` |

Additional effects:
- **Video consultations:** on submit, the slot hold is extended to `least(starts_at, now() + 48h)`, or re-acquired; a taken slot raises `OQ409_SLOT_TAKEN`. Approval confirms the booking, and the existing conflict path still applies. Rejection releases the hold.
- **Lawyer assignment** uses the same rules as before (`assigned_lawyer_id`, otherwise `private.pick_lawyer()`).
- **Leftover gateway attempts** (`initiated`/`pending`, non-manual) are cancelled when a proof is submitted.

**Resubmission policy.** After a rejection the customer may submit again, up to `max_attempts` submissions per order in total (default **3**, admin-configurable 1–10). After that, `OQ409_PAYMENT_ATTEMPTS_EXCEEDED` is raised and the UI asks the customer to contact the team. Retries are never unlimited.

## 4. API endpoints

| Method & path | Who | What |
|---|---|---|
| `GET /api/payments/manual/config` | signed-in | mode, demo flag, per-method destination / placeholder / availability, limits |
| `POST /api/orders/:id/payment-proof` | order customer | validates name/size/type, returns a signed upload URL for `<order>/<user>/<uuid>.<ext>` |
| `POST /api/orders/:id/manual-payment` `{ method, proofPath }` | order customer | checks path ownership + method availability, downloads the object and **sniffs magic bytes** (deletes non-images), then calls `manual_payment_submit` with the server-side demo flag |
| `GET /api/payments/manual/:id/proof` | order customer / admin (RLS lookup) | 60-second signed preview URL |
| `GET /api/admin/manual-payments?status&method&q&sort&dir&page&pageSize` | admin | server-side filtered/sorted/paginated list + KPIs |
| `GET /api/admin/manual-payments/:id` | admin | one submission (deep links from notifications) |
| `POST /api/admin/manual-payments/:id/approve` `{ orderId }` | admin | `manual_payment_approve` |
| `POST /api/admin/manual-payments/:id/reject` `{ orderId, reason? }` | admin | `manual_payment_reject` |
| `POST /api/admin/settings/payments.manual` | admin | destinations + attempt cap (zod-validated, audited) |

The browser never sends an amount. Approve and reject require the `orderId` the admin was looking at; a mismatch raises `OQ409_PAYMENT_ORDER_MISMATCH`.

## 5. Storage security

- Private bucket with no client policies. Only the server signs upload and preview URLs.
- Upload paths are unpredictable and scoped to `<order>/<uploader>/`. Both the route and the SQL function verify that shape, so a path issued for another user or order can't be attached.
- Bucket-level limits (5 MB, image MIME types) are enforced by Storage itself. The server also checks magic bytes, so a renamed PDF is rejected and deleted.
- The 5 MB upload goes browser → Storage directly, which avoids Vercel's 4.5 MB function body limit. Upload progress is reported through XHR.
- Previews are 60-second signed URLs, and only after an RLS-scoped lookup with the caller's own client.
- Notification payloads contain the order number, amount, method, submission id and demo flag. They never contain the proof path or customer details.
- Evidence is never deleted on rejection.

## 6. Admin approval / rejection logic

1. `requireAdmin` in the route.
2. `private.manual_lock_for_review` runs `require_admin` again, then `SELECT … FOR UPDATE` on the submission, order and payment in a fixed order. It checks that the submission belongs to the given order, is still `pending_review`, and that its payment is a `pending` manual row.
3. **Approve** additionally checks that the order is still `awaiting_payment` and unpaid, and that the submission amount, the payment amount and the order total all match. A mismatch is audited and approval is refused. The UI blocks the button in that case too.
4. The decision, payment, order, assignment, booking, status history, notifications and audit row are written in **one transaction**.
5. Concurrent reviewers serialize on the row lock. The second one gets `OQ409_PAYMENT_REVIEWED` (tested with three parallel approvals: exactly one succeeds).
6. Audit actions: `manual_payment.submit | approve | reject | amount_mismatch`. The append-only trigger makes them immutable.

## 7. Demo configuration

| Variable | Values |
|---|---|
| `PAYMENT_MODE` | `manual_demo` (default) · `manual_live` |
| `PAYMENT_LIVE_ACKNOWLEDGED` | must equal `manual-live-reviewed` for `manual_live` to take effect |

- The mode is resolved **only on the server** (`resolvePaymentMode`). It is never inferred from `NODE_ENV` or from anything the browser sends. Any other value falls back to demo.
- **Demo mode:**
  - every submission is stored with `demo_mode = true` and its payment with `is_demo = true`;
  - receipts are `DEMO-RC-…`;
  - approvals are labelled “simulated” and excluded from revenue (`dashboard_kpis`, admin KPI cards, records tab);
  - the banner “وضع تجريبي — جميع عمليات الدفع وإثباتات التحويل للعرض فقط. برجاء عدم تحويل أي أموال حقيقية.” is shown at checkout, on the payment history page and in the admin dashboard;
  - methods without a configured destination show a non-payable placeholder (`demo@example.invalid` for PayPal, “Demo account / Demo wallet — not available for real transfers”);
  - the customer can generate a clearly labelled sample proof image in the browser. It shows the order, method and amount with “DEMO / NOT A REAL RECEIPT” watermarks, and no bank or transaction data.
- **Destinations:** the client's number `01006816005` is configured for InstaPay and Vodafone Cash. **The demo banner still tells customers not to transfer.** Having real-looking destinations does not switch on live mode.
- **Live mode** (not enabled) hides methods that have no destination. Before enabling it you need: a PayPal account, a decision on PayPal currency and fees, finance sign-off on revenue reporting, and a separate implementation review.

## 8. Toast implementation

- One global API, `useToast()`, with `success`, `error`, `warning`, `info`, `loading`, `promise`, `update`, `dismiss` and `dismissAll`. `show()` is kept as a deprecated alias, and every existing call site was migrated.
- Client-only module state. Toasts carry callbacks, so they never enter the SSR payload, and server calls are no-ops.
- Behaviour:
  - per-type durations (success/info 3.5 s, warning 5 s, error 6.5 s); `{ important: true }` errors stay until dismissed;
  - timers pause on hover and focus;
  - a repeated identical message is **deduplicated** (counter ×n, timer restarted);
  - at most 4 toasts are visible (the oldest non-persistent one is dropped first);
  - optional action button.
- `UiToaster` has two live regions: errors use `role="alert"` (assertive), everything else `role="status"` (polite). Each toast has a visually hidden type label and a close button.
- Layout: bottom inline-end on desktop, full width on mobile. Logical properties keep RTL correct. Slide direction uses the new `--dir-sign` / `--dir-start` CSS variables (`base.css`). `prefers-reduced-motion` is respected.
- Visuals use design tokens only: card surface, accent border per type, Lucide icons, timer bar.
- Not used for inline field validation (proof errors are shown inline **and** toasted, as specified) or for page loads.

> Fixed during testing: Vue scoped CSS compiles `:global([dir='rtl']) .x` to a bare `[dir='rtl']` rule. That applied the toast and panel slide transforms to `<html>` and caused 24–40 px of horizontal overflow on every page. It is replaced by the CSS-variable approach above, and the responsive E2E checks pass again.

## 9. Test results (local, 2026-10-15)

| Suite | Result |
|---|---|
| `nuxt typecheck` | ✅ no errors |
| `eslint .` | ✅ no errors |
| Unit (`vitest --project unit`) | ✅ 33 passed, including new `manualPayments.test.ts` (magic bytes, file rules, settings schema, A/B/C/D state) and `toast.test.ts` (types, persistence, dedupe, cap, promise) |
| Integration (`vitest --project integration`, real local Supabase + dev server) | ✅ 49 passed. `payments.test.ts` was rewritten with 21 tests (below); lifecycle, isolation, booking and privileges were updated to the manual flow |
| E2E (Playwright, desktop + Pixel 7) | ✅ 27 passed, 1 skipped (mobile-only menu test on desktop) |
| `nuxt build` | ✅ builds. Running `.output` locally fails SSR with a Pinia “no active Pinia” error, but **the untouched HEAD commit fails identically** (checked in a separate worktree) and the Vercel deployment of HEAD works. It is a local build-environment issue, not part of this change. |

Integration coverage in `payments.test.ts`:
- **Submission:** submit → `pending_review`; the order is not paid or started; customer and admin notifications are created, and the admin payload has no proof path; duplicate submission while pending → 409.
- **Approval:** paid + `in_progress` + lawyer assigned; `DEMO-RC` receipt; customer gets `payment.approved` + `order.started`; lawyer gets `order.assigned`; audit trail written; status history ends `awaiting_payment → in_progress`.
- **Lawyer queue:** the assigned lawyer sees the active order through RLS.
- **Concurrency:** three parallel approvals → exactly one succeeds; reject-after-approve → 409. Wrong order → 409.
- **Rejection:** reason saved, evidence kept in storage, order blocked, payment failed, customer notified; retry cap of 3 enforced; a later approved proof pays the order; a proof pending on a cancelled order can be rejected but not approved.
- **Security:**
  - customers and lawyers get 403 on approve, reject and list;
  - the SQL functions reject a non-admin actor even when called with the service role;
  - customers can't update or insert submissions or set orders paid;
  - proof URLs work only for the owner and admins (other customer 404, lawyer 404, anonymous 401); the bucket is not publicly readable;
  - a proof path can't be reused on another user's order;
  - unauthenticated sign → 401;
  - PDF → `OQ422_PROOF_TYPE`; declared > 5 MB → `OQ422_PROOF_SIZE`; actual > 5 MB refused by Storage; a renamed non-image is detected and deleted;
  - **old gateway:** `/checkout`, the webhook and the simulator routes return 404 and `payment_start` raises `OQ410`;
  - decided submissions and audit rows can't be updated or deleted;
  - demo approvals are excluded from `dashboard_kpis` revenue.

E2E (`tests/e2e/contract-order.spec.ts`):
1. Registration → contract form + upload → checkout → InstaPay (shows `01006816005`, exact amount) → proof preview → submit → “جاري مراجعة الدفع”. The admin opens the proof in the review panel, approves with confirmation, and gets the success toast. The customer then sees “تم قبول الدفع وبدأ تنفيذ الخدمة” with the `DEMO-RC` receipt.
2. Vodafone Cash with the generated demo proof → admin rejects with a reason → the customer sees the rejection message, the reason, “تواصل معنا” and “إرسال إثبات جديد”.
3. PayPal shows `demo@example.invalid` and the placeholder note; a PDF and a > 5 MB image are refused inline; submit stays disabled.

The existing `delivery-acceptance.spec.ts` now pays through the manual flow (via helper) and still passes.

## 10. Gateway code: removed, retired, retained

| Item | Decision |
|---|---|
| `server/api/orders/[id]/checkout.post.ts` | **Removed** (would bypass verification) |
| `server/api/payments/webhook/[provider].post.ts` | **Removed** (no gateway is integrated) |
| `server/api/dev/payment-simulator/[id].post.ts`, `app/pages/dev/payment-simulator/[id].vue` | **Removed** |
| `server/services/payments/{index,types,simulator,paymob}.ts`, `tests/unit/simulator.test.ts` | **Removed** (no remaining dependents) |
| `app/components/checkout/PaymentMethodPicker.vue` (card/wallet/Fawry) | **Removed**, replaced by `ManualMethodPicker` |
| `PAYMENTS_PROVIDER`, `PAYMENTS_SIMULATOR_SECRET`, `PAYMOB_*` env vars | **Removed** from runtime config / `.env.example` (unused if still set on Vercel) |
| SQL `payment_start` | **Retired** (raises `OQ410_GATEWAY_RETIRED`), signature kept |
| SQL `payment_record_result`, `payment_attach_reference` | **Retained**, service-role only, no caller; kept for migration compatibility and history |
| Tables `payments`, `payment_events`, `refunds`; enum values `card/wallet/fawry`; provider values `simulator/paymob` | **Retained**: historical rows and relationships are untouched. They are shown in the admin “All records” tab as “Archive (provider)” |
| i18n: `checkout.methods.card/wallet/fawry` | Retained (labels for history). Gateway-only strings were deleted. |

## 11. Remaining limitations / next steps

- **Hosted Supabase:** both migrations were applied on 2026-10-15 with the user's approval. Migration history was set to the file versions `20261015000100` / `20261015000200`. Verified on the hosted DB: RLS + 1 select policy, private `payment-proofs` bucket (5 MB, images, no storage policies), destinations seeded, new functions service-role only, no public function leaks, triggers present. **The app code is not deployed yet**: commit + push to `main` and Vercel deploys. Until then, the live site still runs the old checkout, which can no longer start payments (`payment_start` is retired), so deploy soon.
- **PayPal account** is pending. In demo mode a placeholder is shown; enter the account in Dashboard → Settings → الدفع when available.
- **No OCR or automatic matching** of proof amounts: the admin compares the image with the expected amount by eye.
- **Customer cancellation while a proof is pending:** the order and the pending payment row are cancelled. The submission stays in the admin queue as `pending_review`: approval is refused (`OQ409_NOT_PAYABLE`, also shown in the panel) but rejection works, so the admin closes it (tested).
- **Live mode** has a deliberate extra switch (`PAYMENT_LIVE_ACKNOWLEDGED`). Before enabling it, review: PayPal currency and fees, a refund process for manual transfers, revenue reporting, and e-invoicing.
- **Rate limiting** still uses the existing in-memory limiter (per-instance on Vercel).
