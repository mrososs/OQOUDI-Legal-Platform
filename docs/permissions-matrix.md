# Permissions matrix

Actors: **Anon** (visitor) · **Cust** (member of the order's customer account) · **Other cust** (authenticated customer, not a member) · **Lawyer (assigned)** · **Lawyer (other)** · **Admin**.

Enforcement column: **RLS** = row-level security policy on SELECT; **FN** = check inside `SECURITY DEFINER` business function (executable by `service_role` only, invoked from a Nitro route that authenticated the actor); **SRV** = Nitro route check; **ST** = storage (bucket has no client policies, signed URLs only).

## Catalog & content

| Resource / action | Anon | Cust | Lawyer | Admin | Enforced by |
|---|---|---|---|---|---|
| Read published services, categories, add-ons, enabled sections, published form version | ✅ | ✅ | ✅ | ✅ | RLS |
| Read draft services / unpublished form versions | ❌ | ❌ | ✅ (read-only) | ✅ | RLS |
| Create / edit / publish services, pricing, sections, forms | ❌ | ❌ | ❌ | ✅ | SRV + FN |
| Read published reviews | ✅ | ✅ | ✅ | ✅ | RLS |
| Reply to reviews, hide reviews | ❌ | ❌ | ✅ reply on assigned orders | ✅ | FN |
| FAQ, content pages (read) | ✅ | ✅ | ✅ | ✅ | RLS |
| FAQ, content pages, platform settings (write) | ❌ | ❌ | ❌ | ✅ | SRV + FN |
| Submit contact message | ✅ (rate-limited) | ✅ | ✅ | ✅ | SRV |
| Read contact messages | ❌ | ❌ | ❌ | ✅ | RLS |

## Orders

| Action | Anon | Cust | Other cust | Lawyer (assigned) | Lawyer (other) | Admin | Enforced by |
|---|---|---|---|---|---|---|---|
| Create order for a published service | ❌ | ✅ (own account) | — | ❌ | ❌ | ❌ | SRV + FN |
| Read order, answers, events (customer-visible) | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | RLS |
| Read staff-only events and internal notes | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | RLS |
| Send message | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | FN |
| Request info (→ `awaiting_info`), start work, change status | ❌ | ❌ | ❌ | ✅ (matrix) | ❌ | ✅ | FN |
| Upload deliverable version | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | SRV + FN |
| Accept delivery / request revision | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | FN |
| Publish written consultation answer | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | FN |
| Set / update Google Meet link | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | FN |
| Cancel order | ❌ | ✅ before work starts (`new`, `awaiting_payment`) | ❌ | ❌ | ❌ | ✅ any non-terminal | FN |
| Issue quote amount (quote services) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | FN |
| Assign / reassign lawyer | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | FN |
| Submit review (completed order, once) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | FN + unique constraint |

## Documents (private bucket `order-documents`)

| Action | Anon | Cust | Other cust | Lawyer (assigned) | Lawyer (other) | Admin | Enforced by |
|---|---|---|---|---|---|---|---|
| Request upload URL for own staged attachment | ❌ | ✅ | — | — | — | — | SRV (type/size limits) |
| Read metadata of order documents | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | RLS |
| Download (server stream via 60 s signed URL) | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | SRV (RLS-scoped lookup) + ST |
| Direct storage access by path | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (service role only) | ST |

Access is logical: losing membership/assignment immediately removes RLS visibility, so no further downloads are possible. Storage URLs are never handed to browsers.

## Payments

| Action | Anon | Cust | Lawyer | Admin | Enforced by |
|---|---|---|---|---|---|
| Start checkout for own unpaid order | ❌ | ✅ | ❌ | ❌ | SRV + FN (amount computed server-side) |
| Mark payment succeeded/failed | ❌ | ❌ | ❌ | ❌ | **Only** verified provider webhook → FN |
| Read own payments / receipts | ❌ | ✅ | ❌ | ✅ | RLS |
| Read all payments, revenue KPIs | ❌ | ❌ | ❌ | ✅ | RLS |
| Refund | ❌ | ❌ | ❌ | ✅ | FN |

Ordinary lawyers do **not** see payment amounts beyond the order total on their assigned orders.

## Consultations

| Action | Anon | Cust | Lawyer | Admin | Enforced by |
|---|---|---|---|---|---|
| View available slots (no customer data) | ✅ | ✅ | ✅ | ✅ | FN (`available_slots`, `security definer`, returns times only) |
| Hold slot (via order creation) | ❌ | ✅ | ❌ | ❌ | FN + exclusion constraint |
| Reschedule (≥ 24 h before) | ❌ | ✅ | ✅ assigned | ✅ | FN |
| Edit working hours / blocked dates | ❌ | ❌ | ❌ | ✅ | FN |
| Read booking | ❌ | ✅ own | ✅ assigned | ✅ | RLS |

## Identity

| Action | Self | Admin | Enforced by |
|---|---|---|---|
| Read own profile/roles/account | ✅ | ✅ all | RLS |
| Update own profile name/phone/locale | ✅ (columns restricted) | ✅ | RLS + column grant |
| Grant/revoke `lawyer`/`admin` | ❌ | ✅ (cannot remove own admin) | SRV + FN + audit log |
| Read audit log | ❌ | ✅ | RLS |

## Tests proving the matrix
See `tests/integration/*.test.ts` (run against the local Supabase stack): customer A vs B orders and documents, unassigned lawyer, lawyer vs settings/payments, forged payment confirmation, webhook replay, double booking, deliverable version retention, price snapshot.
