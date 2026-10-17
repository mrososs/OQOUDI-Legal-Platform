/**
 * Post-authentication routing rules, shared by every sign-in path (password,
 * Google callback, email confirmation, guest guard) so they all agree.
 * Pure functions only: no Nuxt, no network.
 */

/** Where a customer finishes first-time onboarding (unlocalised route). */
export const ONBOARDING_PATH = '/account/complete-profile'

const STAFF_HOME = '/dashboard'
const CUSTOMER_HOME = '/account'

/** Route without its `/en` locale prefix (Arabic is the unprefixed default). */
function withoutLocale(path: string): string {
  return path.replace(/^\/en(?=\/|$)/, '') || '/'
}

function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code <= 0x1F || code === 0x7F) return true
  }
  return false
}

/**
 * Accepts only same-origin absolute *paths* as a post-login destination.
 * Rejects open redirects (`//evil.com`, `/\evil.com`, `https://…`, control
 * characters that browsers strip before parsing) and any target that would
 * bounce the user straight back into the auth flow (`/auth/*`, onboarding).
 */
export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\') || hasControlCharacter(v)) return null

  let url: URL
  try {
    url = new URL(v, 'https://oqoudi.invalid')
  }
  catch {
    return null
  }
  if (url.origin !== 'https://oqoudi.invalid') return null

  const path = withoutLocale(url.pathname)
  if (path === '/auth' || path.startsWith('/auth/') || path === ONBOARDING_PATH) return null
  return v
}

export interface PostAuthState {
  /** Admin or lawyer — an authorised staff role is active. */
  isStaff: boolean
  /** A customer profile is loaded and onboarding is not finished. */
  needsOnboarding: boolean
}

export interface PostAuthTarget {
  /** Route to open. Unlocalised unless `localized` is true. */
  path: string
  /** `true` when `path` already carries its locale prefix (a validated `redirect`). */
  localized: boolean
  /** Destination to resume after onboarding. */
  redirect: string | null
}

/**
 * One decision for every sign-in:
 *   staff                              → their destination (dashboard)
 *   customer, onboarding incomplete    → complete-profile (keeps `redirect`)
 *   customer, onboarding complete      → `redirect` or the customer account
 * Staff are never sent through customer onboarding.
 */
export function resolvePostAuthTarget(state: PostAuthState, redirect?: unknown): PostAuthTarget {
  const safe = safeRedirectPath(redirect)

  if (state.isStaff) {
    return safe ? { path: safe, localized: true, redirect: null } : { path: STAFF_HOME, localized: false, redirect: null }
  }
  if (state.needsOnboarding) {
    return { path: ONBOARDING_PATH, localized: false, redirect: safe }
  }
  return safe ? { path: safe, localized: true, redirect: null } : { path: CUSTOMER_HOME, localized: false, redirect: null }
}
