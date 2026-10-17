/** Login/register pages: signed-in users go where the post-auth rules send them. */
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) return
  const { settle } = usePostAuth()
  return navigateTo(await settle(user.value.sub, to.query.redirect, false), { replace: true })
})
