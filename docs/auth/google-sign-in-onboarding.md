# Google sign-in and smart customer onboarding

Status: implemented and verified locally on 2026-10-17 (branch `feat/google-sign-in-onboarding`, based on `main` @ `16c3938`).
Rollout rule (§10): migration `20261017090000_google_onboarding.sql` must be applied to the hosted database **before** the app is deployed. Check `supabase migration list --linked` for its current hosted state rather than trusting this page.

> **Honest scope.** A *real* Google login needs a Google account and its consent screen, so it was **not** performed. Everything around it was verified against real GoTrue with a **mock identity provider** standing in for Google (§9). The hosted project's Google provider was confirmed *enabled* by a read-only probe (§10), nothing more.

---

## 1. What a user experiences

```
Login or Register page
   └─ "Continue with Google" / "المتابعة باستخدام Google"
        → Google account chooser (prompt=select_account)
        → Supabase  /auth/v1/callback
        → app  /auth/callback          (locale-aware: /en/auth/callback)
              ├─ cancelled / expired / invalid  → clear message + "try again"
              └─ session established → ONE decision (§3)
                    admin / lawyer            → /dashboard
                    customer, incomplete      → /account/complete-profile
                    customer, complete        → requested page, else /account
```

Email/password sign-in and registration are unchanged. The same Google account works from **either** page: the page the user clicked from never decides "new vs existing" — the database does.

## 2. Authentication flow and callback behaviour

* `useGoogleSignIn()` calls the official `supabase.auth.signInWithOAuth({ provider: 'google', … })` on the existing `@nuxtjs/supabase` client (PKCE, SSR cookies).
* `redirectTo = window.location.origin + localePath('/auth/callback')`. It is deliberately the **current origin**: the PKCE code verifier lives in a cookie on the origin that started the flow, so a configured constant (or a hard-coded `localhost`) could only break the exchange. No URL is hard-coded.
* **No explicit code exchange.** `@nuxtjs/supabase` 2.0.10 builds the browser client with `createBrowserClient` (PKCE, `detectSessionInUrl`) and its plugin awaits `getSession()` before any page mounts, so supabase-js exchanges `?code=` itself. Calling `exchangeCodeForSession` as well would redeem a one-time code twice and fail. **Verified:** exactly one `grant_type=pkce` request per login (E2E asserts it).
* `/auth/callback` is client-rendered (`routeRules … ssr: false`), `cache-control: no-store`, `referrer-policy: no-referrer` (the URL holds a one-time code). Its logic lives in `useOAuthCallback()`:
  * error in query **or hash** (GoTrue reports in the hash) → mapped message, no session;
  * session present → `settle()` → navigate with `replace: true` (Back never returns to the callback);
  * code still in the URL but no session → wait ≤ 6 s, then "expired";
  * neither → "invalid".
* The page the visitor wanted before signing in is parked in `sessionStorage` (`oq.postAuthRedirect`), not in the callback URL, so the callback URL stays exact (easy to allow-list) and nothing in the URL can steer the redirect. It is re-validated on read.

| Failure | Detected from | Message key |
|---|---|---|
| user cancelled at Google | `error=access_denied` | `auth.callback.failed.cancelled` |
| expired / used / unknown code, lost verifier | `flow_state_*`, `bad_oauth_*`, bogus `?code=` | `expired` |
| bare visit with no parameters | nothing in URL, no session | `invalid` |
| provider email not verified | `provider_email_needs_verification` | `emailNotVerified` |
| email already registered elsewhere | `email_exists`, `identity_already_exists`, … | `accountExists` |
| anything else | — | `generic` |

## 3. One post-authentication decision

`shared/domain/postAuth.ts` (pure, unit-tested) is used by **password login, Google callback, email confirmation, the `guest` middleware and the onboarding form**:

1. session validated by Supabase; roles/profile re-read from the database (`session.load(id, force)`);
2. staff (`admin` or `lawyer`) → their destination, **never** customer onboarding;
3. customer with `onboarding_completed_at IS NULL` → `/account/complete-profile?redirect=<safe>`;
4. customer complete → safe `redirect` or `/account`.

`safeRedirectPath()` accepts only same-origin absolute paths. It rejects `//host`, `https://…`, backslashes, control characters (browsers strip them before parsing), non-parsable values, and any target under `/auth/*` or the onboarding page (so no loop is possible). `replace: true` is used for every post-auth navigation.

Middleware: `auth` (protected customer pages) redirects an incomplete customer to onboarding; `onboarding` (the page itself) sends signed-out visitors to login and completed customers/staff onward; `guest` (login/register) forwards signed-in users by the same rules. Public browsing (home, services, directory) is never gated. This is **UX only**; the security boundary is §6.

## 4. New vs existing user detection

| Question | Source of truth |
|---|---|
| Is this a new person? | GoTrue: `(provider, sub)` identity lookup. First time → new `auth.users` row → `handle_new_user()` |
| Does this person need onboarding? | `profiles.onboarding_completed_at IS NULL` and no staff role |
| Which account is theirs? | `customer_account_members` of the verified user id |

Never derived from which button was clicked, from Google metadata, or from anything the browser sends.

## 5. Onboarding page — `/account/complete-profile`

Fields: full name (required, ≥ 3, prefilled from Google `full_name`/`name`, editable) · email (**read-only**, from the authenticated session) · Egyptian mobile (required, existing validators/normalisation → `+201XXXXXXXXX`) · account type فرد/شركة · company name (required only for company).

Rules live in `shared/domain/onboarding.ts` and are shared by the form and the server route. Labels use the exact Arabic wording requested. English equivalents are in `onboarding.*`. Failed saves keep the form filled; retry is safe (idempotent).

## 6. Persistence and database changes

Migration `supabase/migrations/20261017090000_google_onboarding.sql` (additive; sorts after the catalog migrations and the single-admin migration):

1. `profiles.onboarding_completed_at timestamptz` — the onboarding state. **Not** in the `authenticated` column grant (`full_name, phone, preferred_locale`), so a browser cannot mark itself onboarded.
2. **Backfill:** historical users with a phone, and all staff, are marked complete (`created_at`). Customers without a phone are genuinely incomplete and will be asked once. Re-runnable, never rewrites an existing value. *Hosted check (read-only, 2026-10-17): 6 profiles, 6 with a phone, 1 admin → all 6 would be backfilled, 0 would be asked.*
3. `private.handle_new_user()` redefined with one change: an **email/password** signup that supplied a valid phone is born complete; any other provider (Google) is born incomplete. Same bootstrap otherwise: profile + `customer` role + **one** individual account + owner membership. Roles are never taken from metadata.
4. `public.complete_customer_onboarding(p_actor, p_full_name, p_phone, p_account_kind, p_company_name, p_locale)` — `SECURITY DEFINER`, `service_role` only. **One transaction**:
   * locks the profile row first (concurrent submissions serialise);
   * staff → `not_required`, nothing modified;
   * already complete → `already_completed`, nothing modified (first write wins; later edits belong to account settings);
   * otherwise updates the account `handle_new_user` already created (kind + display name), the profile (name, phone, locale) and `onboarding_completed_at`, and writes an audit row;
   * never inserts a second account (defensive insert only for a user with no membership at all);
   * refuses to change the account *kind* if the account already has orders (`OQ409_ACCOUNT_KIND_LOCKED`) — historical ownership/meaning is never altered;
   * any failure rolls everything back: it cannot leave the profile "complete" with missing data (tested with an injected failure).
5. `private.orders_require_onboarding()` — `BEFORE INSERT` trigger on `orders`: a non-staff creator without `onboarding_completed_at` gets `OQ403_ONBOARDING`. It fires inside `order_create()` without redefining it (that function already has a merge note and other agents' changes).

API: `POST /api/account/complete-profile` → `requireUser` (JWT verified server-side) → rate limit → shape check → shared validation → RPC with `p_actor` from the session. `userId`, `accountId`, `role`, `email` in the body are **ignored** (tested).

## 7. Identity linking

Handled by GoTrue's documented automatic linking; the app does not merge anything itself.

| Case | Behaviour (verified locally) |
|---|---|
| Google email is **verified** and matches an existing email/password user | The Google identity is **linked to the same `auth.users` row**: same id, profile, account, orders, role; password still works; no onboarding (already complete) |
| Provider email **unverified** and matches an existing user | GoTrue refuses to create/link ("Database error saving new user" — unique email). **No session, no merge**, existing user untouched; the callback shows the generic error |
| Existing Admin, verified Google email | Linked to the Admin; role preserved; `/dashboard`; no onboarding; **no** new customer account |
| Different Google account whose name says "admin" | Plain customer; `user_roles` is only `customer` |

Notes: (a) matching email alone grants nothing — GoTrue requires the provider to assert the email is verified, and roles come only from `user_roles`; (b) an Admin's email address must therefore be one only that Admin controls; (c) a user who registered with Google first and later wants a password uses "Forgot your password?" (GoTrue links an `email` identity); (d) manual linking (`linkIdentity`) is **not** implemented — automatic linking covers the verified-email case and the failure path gives a clear recovery message. Hosted "Allow manual linking" is not required.

## 8. Security checklist

* No service-role/secret key in browser code; the server route uses the existing `adminClient`.
* Official Supabase OAuth/PKCE; no custom token handling; no tokens/codes logged.
* RLS and role authorisation unchanged; `onboarding_completed_at` not browser-writable; the RPC is not executable by `anon`/`authenticated` (`privileges.test.ts` passes).
* Open redirects and auth loops neutralised (§3); callback is no-store / no-referrer.
* No extra password accounts for Google users; email confirmation for password signup untouched; no passwords reset; no users deleted/recreated.
* Duplicate/concurrent submissions: row lock + idempotent RPC (6 parallel submissions → one `completed`, five `already_completed`, one account, one audit row).
* Server-side gate on order creation (trigger) in addition to route middleware.

## 9. Test results (2026-10-17, isolated local stack `oqoudi-gauth`, ports 556xx, dev server :3200)

Four buckets, as agreed for this project.

### Implemented and verified

| Check | Result |
|---|---|
| ESLint (whole repo) | clean |
| Unit (`npm test`) | **117 / 117** (new: `postAuth.test.ts`, `onboarding.test.ts` — redirect safety, loop prevention, staff exemption, phone/name/company rules) |
| Integration, new file `google-onboarding.test.ts` | **25 / 25** — Google-shaped signup bootstrap; individual + company completion on the *same* account; field validation writes nothing; retry after failure; idempotent repeat; 6 concurrent submissions → 1 `completed`; returning user untouched; order gate (API **and** direct `order_create`); staff exempt; no browser-supplied identity honoured; direct RPC refused (`42501`); user cannot self-mark onboarded or touch roles/other profiles; Admin unchanged; metadata cannot grant roles or pre-complete onboarding; account-kind lock with orders; **atomic rollback** via an injected failure; backfill statement (real SQL extracted from the migration) |
| Integration, whole suite | **189 / 190**. The one failure, `launch-campaign.test.ts:219` ("orders created before the campaign feature are untouched"), needs legacy orders with an empty `pricing_snapshot`; a freshly migrated database has none. Unrelated to onboarding (the trigger never touches pricing) |
| Privilege baseline (`privileges.test.ts`) | passes with the new function present |
| E2E `google-oauth.spec.ts` (desktop) | **24 / 24** on the last complete run — see the list below |
| `nuxt typecheck` | clean when last run (after all app code; since then only a timeout constant, test files and docs changed) |

E2E coverage (real GoTrue + real app + mock IdP): new Google user → onboarding (prefill, read-only email, validation, company, completion, no OQOUDI email sent, **exactly one PKCE exchange**, no auth console errors, survives refresh) · returning user from **both** login and register, no duplicates, Google's name does not overwrite the customer's · verified-email link to an existing password customer (same user id, account, order and role preserved, identities `email`+provider, password still works) · unverified provider email → no merge, no session · existing Admin → `/dashboard`, role/account/profile unchanged · different Google account named "admin" → customer only · cancel at the provider, bare/bogus/expired callback, hash and query errors, six error classes → right message, still signed out · protected pages redirect to onboarding and resume the original page; public pages stay open; login/register forward an incomplete user (no loop) · open-redirect payloads (`//evil`, `https://evil`, `/auth/login`, onboarding itself, `/\evil`) neutralised · complete-profile closed to signed-out, completed and staff users · browser Back · `/en` flow (locale kept through the callback, profile records `en`) · RTL/LTR × desktop/mobile: no horizontal overflow, ≥ 44 px Google button.

### Not verified

* **A real Google login.** Needs a Google account and consent; not performed. Google-specific behaviour (account chooser, consent, Google's claim set) is untested.
* **The hosted redirect allow-list and Google client secret** (not readable from here; §10).
* **A production build** (`nuxt build`) was not run in this session.
* **The full E2E suite.** The run was stopped by Claude Code (system critically low on memory) before the other specs finished, so **no pass/fail is claimed for the pre-existing E2E specs**. The first of them, `contract-order.spec.ts`, failed for an environment reason: its confirmation-link regex hard-codes the default stack port `55321`, while this worktree's isolated stack runs on `55621`. The app reached the "check your inbox" screen and the email arrived, so registration works; the `confirm.vue` change (email-confirmation landing → shared post-auth decision) has therefore **not** been exercised end to end.
* `tests/e2e/google-oauth.spec.ts` `shot()` (element screenshots without the dev badge) was written after the last complete run and has not been executed. The screenshots from the earlier run still show the dev-only Nuxt DevTools badge, so they are **not committed**; running the spec regenerates them into `docs/auth/screenshots/`.
* `nuxt typecheck` was not re-run after the last small edits.

### Mocked

* Google itself: `tests/e2e/mock-idp.ts` is a local OAuth2/OIDC server behind GoTrue's `keycloak` provider (the only provider whose URL can be pointed at localhost). The app still asks for `provider=google`; the test rewrites that one query parameter on GoTrue's `/authorize` request. Identity linking was therefore observed with provider `keycloak`.
* Integration tests create Google-shaped users through the admin API (`app_metadata.provider = google`) and give them a password only to obtain a test session.

### Blocked / awaiting a decision

* Applying the migration to hosted Supabase and deploying (explicit approval needed; see §10 for the order).
* A real Google login on the live site, using an account you own.
* Confirming the Redirect-URL entries in the Supabase dashboard.

### Test-harness notes

The Vite dev server occasionally never reaches `networkidle` right after a redirect chain, and a click made before hydration becomes a native form submit. The OAuth spec therefore navigates with `go()` (DOMContentLoaded + hydration check + best-effort idle). This is a dev-mode/harness effect, not an application defect (each case passed when isolated).

## 10. Remaining configuration and deployment order

**Google Cloud / Supabase (hosted) — verify in the dashboards; cannot be checked from here:**

* Google Cloud OAuth client (Web application): *Authorised redirect URI* = `https://dnoyswgsbcassyrfmorg.supabase.co/auth/v1/callback`.
* Supabase → Authentication → URL Configuration: **Site URL** `https://oqoudi-gray.vercel.app`; **Redirect URLs** must include `https://oqoudi-gray.vercel.app/auth/callback` **and** `https://oqoudi-gray.vercel.app/en/auth/callback` (or `https://oqoudi-gray.vercel.app/**`). Add `http://localhost:3000/**` for local dev. A missing entry makes Supabase fall back to the Site URL and the login lands on `/?code=…`.
* Leave "Confirm email" **on** (password signups). Google users need no OQOUDI confirmation email (none is sent — tested).

**Read-only probe of hosted (2026-10-17):** `GET /auth/v1/authorize?provider=google` → `302` to `accounts.google.com` with a client id and `redirect_uri=https://dnoyswgsbcassyrfmorg.supabase.co/auth/v1/callback`. So the provider **is enabled** and has a client id. Not proven: that the secret is correct, the consent screen is published, or the redirect allow-list.

**Order of rollout (do not reverse):**

1. Approve and apply `20261017090000_google_onboarding.sql` to hosted (the user runs `db push`; the sibling migration `20261016093000` sorts earlier, so `--include-all` may be needed if it is still unapplied). Safe for the *currently deployed* app: it only adds a nullable column, a trigger and a service-only function.
2. Deploy the app. **Deploying first is wrong**: the session store selects `profiles.onboarding_completed_at`, so until the column exists every profile read fails — names/phones go blank, and a first-time Google user would skip onboarding and reach `/account` with no phone (the order gate trigger would also be missing). It degrades rather than locking people out, but it defeats the feature.
3. Do one real Google login with an account you own and walk Scenario A once on the live site.

**Local Google testing:** `supabase/config.toml` now contains a disabled `[auth.external.google]` block. To use it: create a Google OAuth client with redirect `http://127.0.0.1:55321/auth/v1/callback`, export `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, set `enabled = true`. Never commit the secret.

## 11. Merging with the other in-flight work

Checked against the uncommitted single-admin worktree (`D:\mostqel\lawyer-single-admin`) on 2026-10-17. Nothing of theirs was touched.

| File | Overlap | Resolution |
|---|---|---|
| `app/stores/session.ts` | they add `operatingMode` and redefine `isStaff`; I add `needsOnboarding` + one column in the profile select | independent hunks. `needsOnboarding` is built on `isStaff`, so it follows their definition (a lawyer-only user is a customer in single-admin mode, and is asked to onboard like one) |
| `i18n/locales/{ar,en}.json` | both add keys | additive; keys are under `auth.*`, `onboarding.*`, `errors.OQ403_ONBOARDING / OQ422_ONBOARDING / OQ409_ACCOUNT_KIND_LOCKED` — deep-merge |
| `shared/domain/errors.ts` | both add error codes | additive lines |
| `playwright.config.ts` | both make the `webServer` follow `APP_URL` | take theirs (superset) |
| migrations | none redefine `handle_new_user` or touch `orders` inserts; `20261017090000` sorts after `20261016093000` and `…174xxx` | no ordering conflict |

The catalog work (already in `main`) redefines `order_create`; the onboarding gate is a trigger on `orders` precisely so it does not collide with that function.

## 12. Files

| Area | Files |
|---|---|
| Shared | `shared/domain/postAuth.ts`, `shared/domain/onboarding.ts`, `shared/domain/errors.ts` (3 codes), `shared/types/database.types.ts` (regenerated) |
| Database | `supabase/migrations/20261017090000_google_onboarding.sql`, `supabase/config.toml` (disabled Google block) |
| Server | `server/api/account/complete-profile.post.ts` |
| App | `app/pages/auth/callback.vue`, `app/pages/account/complete-profile.vue`, `app/components/auth/AuthGoogleSignIn.vue`, `AuthOnboardingForm.vue`, `AuthAccountKindPicker.vue`, `app/composables/usePostAuth.ts`, `useGoogleSignIn.ts`, `useOAuthCallback.ts`, `useCompleteProfile.ts`, `app/utils/postAuthRedirect.ts`, `app/middleware/{auth,guest,onboarding}.ts`, `app/stores/session.ts`, `login.vue`, `register.vue`, `confirm.vue`, `UiInput.vue` (`readonly`) |
| Config | `nuxt.config.ts` (callback route rules), `playwright.config.ts` (`webServer.url` honours `APP_URL`), `i18n/locales/{ar,en}.json` |
| Tests | `tests/unit/{postAuth,onboarding}.test.ts`, `tests/integration/google-onboarding.test.ts`, `tests/e2e/google-oauth.spec.ts`, `tests/e2e/mock-idp.ts` |
| Screenshots | generated by the E2E spec into `docs/auth/screenshots/` (Arabic RTL/English LTR × desktop/mobile); not committed |
