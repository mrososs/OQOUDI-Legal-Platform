/** Platform-administration pages. Must run after `auth`. */
export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser()
  const session = useSessionStore()
  await session.load(user.value?.sub)
  if (!session.isAdmin) {
    return navigateTo(useLocalePath()(session.isStaff ? '/dashboard' : '/account'))
  }
})
