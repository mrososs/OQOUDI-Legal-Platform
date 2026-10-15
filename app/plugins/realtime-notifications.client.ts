import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '#shared/types/database.types'

/**
 * One realtime subscription per signed-in user, filtered to their own
 * notifications (RLS is also applied by Realtime). New notifications bump
 * the unread badge and refresh data that depends on them.
 */
export default defineNuxtPlugin({
  name: 'oq-realtime-notifications',
  dependsOn: ['oq-session'],
  setup(nuxtApp) {
    const supabase = useSupabaseClient<Database>()
    const user = useSupabaseUser()
    let channel: RealtimeChannel | null = null

    async function unsubscribe() {
      if (channel) {
        await supabase.removeChannel(channel)
        channel = null
      }
    }

    function subscribe(userId: string) {
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          () => {
            nuxtApp.runWithContext(() => {
              refreshNuxtData(['badge:unread', 'notifications:list', 'notifications:recent', 'notifications:staff', 'badge:dashboard', 'badge:active-orders', 'admin:manual-payments'])
            })
          },
        )
        .subscribe()
    }

    watch(
      () => user.value?.sub,
      async (id) => {
        await unsubscribe()
        if (id) subscribe(id)
      },
      { immediate: true },
    )
  },
})
