import { safeRedirectPath } from '#shared/domain/postAuth'

/**
 * Guard for /account/complete-profile. Requires a signed-in user; anyone who
 * does not need onboarding (staff, or a customer who already finished) is
 * sent on to their destination, so the page can never be revisited or loop.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  const localePath = useLocalePath()
  const { destination } = usePostAuth()
  const session = useSessionStore()
  const redirect = safeRedirectPath(to.query.redirect)

  if (!user.value) {
    return navigateTo({ path: localePath('/auth/login'), query: redirect ? { redirect } : {} })
  }
  await session.load(user.value.sub)
  if (!session.needsOnboarding) {
    return navigateTo(destination(redirect), { replace: true })
  }
})
