/** Login/register pages: signed-in users go to their area. */
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) return
  const session = useSessionStore()
  await session.load(user.value.sub)
  const redirect = typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/') && !to.query.redirect.startsWith('//')
    ? to.query.redirect
    : null
  return navigateTo(redirect ?? useLocalePath()(session.isStaff ? '/dashboard' : '/account'))
})
