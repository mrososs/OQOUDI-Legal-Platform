import { ONBOARDING_PATH } from '#shared/domain/postAuth'

/**
 * Requires a signed-in user, and sends a customer who has not finished
 * onboarding to complete-profile first. UX guard only — data access is
 * enforced by RLS/server, and `orders` inserts are blocked in the database.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  const session = useSessionStore()
  const localePath = useLocalePath()

  if (!user.value) {
    return navigateTo({ path: localePath('/auth/login'), query: { redirect: to.fullPath } })
  }
  await session.load(user.value.sub)
  if (session.needsOnboarding) {
    return navigateTo({ path: localePath(ONBOARDING_PATH), query: { redirect: to.fullPath } })
  }
})
