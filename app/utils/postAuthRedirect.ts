import { safeRedirectPath } from '#shared/domain/postAuth'

/**
 * The page a visitor wanted before signing in with Google. The OAuth round
 * trip leaves the site, so it is parked in `sessionStorage` (per tab, same
 * origin) rather than in the callback URL. That keeps the callback URL exact
 * and easy to allow-list in Supabase, and nothing in the URL can steer the
 * post-login redirect. Every read is re-validated.
 */
const KEY = 'oq.postAuthRedirect'

export function rememberPostAuthRedirect(path: string | null) {
  try {
    if (path) sessionStorage.setItem(KEY, path)
    else sessionStorage.removeItem(KEY)
  }
  catch {
    // storage blocked (private mode): the user simply lands on the default page
  }
}

/** Returns the remembered destination once, then forgets it. */
export function takePostAuthRedirect(): string | null {
  try {
    const value = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return safeRedirectPath(value)
  }
  catch {
    return null
  }
}
