# Database schema

PostgreSQL 17 (Supabase). Migrations: `supabase/migrations/*.sql` (applied in filename order). Seed: `supabase/seed.sql`. Types: `shared/types/database.types.ts` (`npm run db:types`).

## Conventions
- UUID primary keys (`gen_random_uuid()`), `created_at`/`updated_at` (`private.touch_updated_at` trigger).
- Money: `bigint` minor units (piasters). Currency fixed to `EGP` by CHECK.
- Localized text: `jsonb {"ar": "...", "en": "..."}` checked by `private.is_localized()` (Arabic required).
- Business functions: `public.<verb_object>(p_actor uuid, …)`, `SECURITY DEFINER`, `search_path = ''`, EXECUTE granted to `service_role` only (`20261014001400_lock_function_privileges.sql`; test `privileges.test.ts` fails if a new function leaks).
- Errors: `private.fail('OQ…')` → errcode `P0001`, message = stable code (mapped in `shared/domain/errors.ts`).
- Helpers used by RLS live in schema `private` (not exposed through the API).

## Entity overview

```
auth.users 1─1 profiles 1─* user_roles
                  │
                  *─* customer_accounts (via customer_account_members)
                  1─1 lawyer_profiles

service_categories *─* services (primary_category_id + service_category_links)
services 1─* service_addons, service_sections, service_form_versions, service_price_history
services.published_form_version_id → service_form_versions

customer_accounts 1─* orders ─* order_addons, order_events, order_messages, order_notes,
                              order_deliveries ─* documents, revision_requests,
                              consultation_responses ─* documents,
                              documents, payments ─* payment_events, refunds,
                              consultation_bookings (0..1), reviews (0..1), notifications
```

## Identity
| Table | Purpose / key rules |
|---|---|
| `profiles` | 1:1 with `auth.users`; created by trigger `on_auth_user_created` from whitelisted metadata only (`full_name`, `phone`, `account_type`, `company_name`, `locale`). Users may update `full_name`, `phone`, `preferred_locale` (column grant). |
| `user_roles` | `(user_id, role)`; roles `customer` / `lawyer` / `admin`. Signup grants `customer` only. Changed only by `admin_set_user_role` (audited, no self-demotion). |
| `customer_accounts` | Orders belong to an account; `kind` individual/company is a business attribute, not a permission. |
| `customer_account_members` | Membership (`owner`/`member`) → access to the account's orders. |
| `lawyer_profiles` | Display name, title, active flag. Readable by authenticated users (names shown on orders). |

## Catalog
| Table | Notes |
|---|---|
| `service_categories` | slug, localized title/description, icon, order. |
| `services` | slug, `kind` (`standard` / `written_consultation` / `video_consultation`), `pricing_type` (`fixed` / `quote` — quote price = public "starts from"), `base_price_minor`, `status` (`draft` / `published` / `archived`), `published_form_version_id`. CHECKs: video needs duration; consultations are fixed-price. |
| `service_category_links` | Extra directory memberships. |
| `service_addons` | Optional paid extras. Never deleted by the editor (deactivated) so history stays intact. |
| `service_sections` | `(service_id, key)` unique; `is_enabled`, `sort_order`, `content` (shape per key, validated by `shared/domain/serviceSections.ts`). |
| `service_form_versions` | `(service_id, version)` unique; `status` draft/published/retired; ≤ 1 published and ≤ 1 draft per service (partial unique indexes). Trigger blocks any change to a non-draft version's fields and deletion of non-drafts. |
| `service_price_history` | Written by trigger on insert/price change, with actor. |

### Form field schema (`fields` jsonb array)
`{ id, type, label{}, help?{}, placeholder?{}, required?, options?[{value,label{}}], minLength?, maxLength?, min?, max?, accept?[ext], maxSizeMb?, maxFiles? }` with `type ∈ section | help | text | textarea | number | date | select | radio | checkbox | multiselect | file`. Validated by `formFieldsSchema`; answers validated by `validateAnswers` (client and server).

## Orders
| Table | Notes |
|---|---|
| `orders` | `order_number` `DQ-#####` (sequence), `customer_account_id`, `created_by`, `service_id`, `form_version_id`, `service_snapshot` (title, kind, pricing type, base price, delivery estimate, duration), `status`, `payment_status`, `base_price_minor` + `addons_total_minor` = `total_minor` (CHECK), `quote_issued_at`, `form_answers` (`{fieldId: value}`; file fields = document ids), `assigned_lawyer_id`, lifecycle timestamps. |
| `order_addons` | Snapshot of chosen add-ons (title + price at order time). |
| `order_events` | Status history + timeline: `type`, `from_status`, `to_status`, `actor_id`, `actor_kind`, `visibility` (`customer`/`staff`), `details`. |
| `order_messages` | Customer ↔ staff messages. |
| `order_notes` | Staff-only notes. |
| `order_deliveries` | Numbered versions `(order_id, version)` unique; never updated. |
| `revision_requests` | Customer revision reason linked to the delivery it concerns. |
| `consultation_responses` | Written answers, versioned. |
| `documents` | Metadata for every file: `kind` (customer_upload / deliverable / consultation_response / message_attachment), `status` pending/ready, random `storage_path` (`docs/<uuid>.<ext>`), original name, extension, MIME, size (≤ 25 MB), links to delivery/response/message. `order_id` NULL while a customer upload is staged. |

### Order status machine (enforced in SQL)
```
new ──(admin issues quote)──► awaiting_payment ──(verified payment)──► under_review
under_review ⇄ awaiting_info (lawyer asks / customer replies)
under_review ──► in_progress ⇄ under_review
in_progress | under_review | revision ──(deliver vN)──► delivered
delivered ──(customer accepts)──► completed
delivered ──(customer requests revision)──► revision ──► in_progress | delivered
in_progress ──► completed            (video consultations only)
delivered ──► completed              (admin only)
new | awaiting_payment ──► cancelled (customer, unpaid) ; any non-terminal ──► cancelled (admin; paid → refund request)
```
Payment status: `unpaid → paid | failed`, `failed → paid` (retry), `paid → refunded | partially_refunded` (refund processing — modeled, provider processing pending).

## Consultations
| Table | Notes |
|---|---|
| `availability_rules` | Weekly hours (Cairo wall clock), `weekday` = `extract(dow)` (0 = Sunday). `lawyer_id NULL` = platform calendar. |
| `availability_exceptions` | Blocked day (no times) or blocked time range on a Cairo date. |
| `consultation_bookings` | `starts_at`/`ends_at` timestamptz (UTC), `status` held/confirmed/completed/cancelled/expired, `hold_expires_at`, `meeting_url` (CHECK regex for Google Meet). **Exclusion constraint** `tstzrange(starts_at, ends_at) &&` for held/confirmed rows → no double booking under concurrency. |
| `available_slots(from, to)` | SQL function generating 30-min slots from rules in `Africa/Cairo`, excluding exceptions, live holds/bookings, lead time and horizon (`platform_settings.booking`). |

## Payments
| Table | Notes |
|---|---|
| `payments` | One row per checkout attempt: provider, method, status (initiated/pending/succeeded/failed/expired/cancelled), amount (copied from the order), provider reference, receipt number (`RC-…`, on success). Partial unique index: one succeeded payment per order. |
| `payment_events` | Every provider callback, unique `(provider, provider_event_id)` → idempotent processing; stores processing result. |
| `refunds` | Refund requests/results. |

`payment_record_result` (service-role only, called from the verified webhook): dedupes the event, re-checks the amount, marks the attempt + order paid, moves `awaiting_payment → under_review`, assigns a lawyer, confirms the booking (or flags a conflict), notifies both sides — in one transaction.

## Platform
| Table | Notes |
|---|---|
| `reviews` | One per order (unique), only for completed orders of the author (`review_submit`). Public when `is_published`. Staff reply via `review_reply`. |
| `notifications` | `user_id`, `type`, `payload` (rendered with i18n), `read_at`. Realtime-enabled; users can update only `read_at` on their own rows. |
| `contact_messages` | Public contact form (server insert, rate limited), admin read. |
| `faq_entries`, `content_pages` | Public content (localized). |
| `platform_settings` | Key/value; `is_public` rows readable by anyone (contact, booking), others admin-only. |
| `audit_logs` | Role changes, assignments, catalog changes, payment anomalies. Admin read. |

## Storage
Bucket `order-documents`: private, 25 MB limit, MIME allow-list (PDF, DOC/DOCX, JPEG, PNG, WebP). **No `storage.objects` policies** for anon/authenticated — uploads use server-issued signed upload URLs; downloads use 60-second signed URLs issued after an RLS-scoped lookup.

## Catalog hierarchy, pricing and launch campaign (milestone 2, migrations `20261016174000…174600`)
| Element | Notes |
|---|---|
| `service_categories.parent_id` | Two levels only (trigger `OQ422_CATEGORY_PARENT`). A service's `primary_category_id` is its most specific category; a **deferred constraint trigger** also links the parent in `service_category_links` (`on conflict do nothing`). Icon whitelist widened in `service_categories_icon_check`. |
| `services.source_ref` | Stable import identifier (`catalog-2026-10:IND-001`), unique; NULL for hand-made services. `translation_status` (`approved` / `pending_review`). |
| `services.launch_price_minor`, `launch_eligible` | Client-approved launch price (stored explicitly) and inclusion switch. CHECKs: launch ≤ regular; eligible ⇒ launch price set, `kind = standard`, `pricing_type = fixed` (consultations/quote services can never be discounted). `service_price_history` also records both. |
| `service_addons.kind`, `launch_price_minor`, `price_minor` (now nullable) | `vip_delivery` / `bilingual_drafting`. One **active** add-on per kind per service. `price_minor IS NULL` = no regular price approved → the add-on is only accepted while its launch price applies. |
| `orders.pricing_snapshot`, `has_vip_delivery`, `has_bilingual_drafting`; `order_addons.kind / regular_price_minor / launch_price_minor / pricing_applied` | Immutable record of what was charged and why (pre-existing orders keep the defaults). `service_snapshot` also carries `regularPriceMinor`, `launchPriceMinor`, `pricingMode`, `expeditedService`. |
| `platform_settings['pricing.launch_campaign']` | Seeded `{enabled:false, startsAt:null, endsAt:null}`, **not public**. Written only by `admin_set_launch_campaign` (Cairo date/time → `startsAt`, `endsAt` = +15 Cairo calendar days; audited; not movable while active). A guard trigger keeps the row coherent. |
| `private.launch_campaign_status/active`, `public.launch_campaign_state()` | `disabled` / `scheduled` / `active` / `expired` from the **database clock**. |
| `private.price_order(service, addon_ids, at)` | The only place order prices are decided; called by `order_create`, which now returns `totalMinor` and `pricingMode`. |
| `catalog_import_runs`, `catalog_import_items`, `private.catalog_import(payload)` | Idempotent import engine (created / updated / matched / skipped / failed per record, admin-only RLS). Form changes always create a NEW published version. Data lives in `supabase/seeds/catalog_contracts.sql`. |
| `service_form_stats` (view, `security_invoker`) | Form version + input count for the admin list without shipping the form JSON. |
