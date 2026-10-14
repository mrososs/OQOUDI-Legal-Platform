/** Requires a signed-in user. UX guard only — data access is enforced by RLS/server. */
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) {
    const localePath = useLocalePath()
    return navigateTo({ path: localePath('/auth/login'), query: { redirect: to.fullPath } })
  }
  await useSessionStore().load(user.value.sub)
})
