/**
 * Keeps the session store in sync with the Supabase auth user
 * (SSR + client). Runs after the Supabase plugin.
 */
export default defineNuxtPlugin({
  name: 'oq-session',
  dependsOn: ['supabase'],
  async setup() {
    const user = useSupabaseUser()
    const session = useSessionStore()

    await session.load(user.value?.sub)

    if (import.meta.client) {
      watch(() => user.value?.sub, (id) => {
        session.load(id)
      })
    }
  },
})
