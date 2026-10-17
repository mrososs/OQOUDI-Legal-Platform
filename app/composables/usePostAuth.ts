import type { RouteLocationRaw } from 'vue-router'
import { resolvePostAuthTarget } from '#shared/domain/postAuth'

/**
 * The single post-authentication decision (rules in shared/domain/postAuth.ts):
 * staff → dashboard, incomplete customer → complete-profile, otherwise the
 * requested page or the customer account.
 *
 * Call it synchronously from `setup` / a route middleware: it captures the
 * store and the locale helper up front, so `destination` and `settle` stay
 * safe to use after an `await`.
 */
export function usePostAuth() {
  const session = useSessionStore()
  const localePath = useLocalePath()

  /** Where the currently loaded session should go. `redirect` is untrusted input. */
  function destination(redirect?: unknown): RouteLocationRaw {
    const target = resolvePostAuthTarget(
      { isStaff: session.isStaff, needsOnboarding: session.needsOnboarding },
      redirect,
    )
    const path = target.localized ? target.path : localePath(target.path)
    return target.redirect ? { path, query: { redirect: target.redirect } } : path
  }

  /**
   * Loads the user's authoritative roles/profile from the database (forced by
   * default, so a just-finished sign-in or onboarding never reads stale
   * state), then returns where to go.
   */
  async function settle(userId: string, redirect?: unknown, force = true): Promise<RouteLocationRaw> {
    await session.load(userId, force)
    return destination(redirect)
  }

  return { destination, settle }
}
