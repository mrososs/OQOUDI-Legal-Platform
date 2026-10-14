/** Lawyer/admin areas. Must run after `auth`. */
export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser()
  const session = useSessionStore()
  await session.load(user.value?.sub)
  if (!session.isStaff) {
    return navigateTo(useLocalePath()('/account'))
  }
})
