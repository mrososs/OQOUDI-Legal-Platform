import type { Database } from '#shared/types/database.types'
import { fetchNotifications, markNotificationsRead, type NotificationItem } from '~/repositories/account'

/** Notification list + "open" behaviour (mark read, go to the order). */
export function useAccountNotifications(key: 'notifications:list' | 'notifications:recent', limit: number) {
  const supabase = useSupabaseClient<Database>()
  const localePath = useLocalePath()

  const list = useAsyncData(key, () => fetchNotifications(supabase, limit), { default: () => [] as NotificationItem[] })

  async function open(item: NotificationItem) {
    if (!item.readAt) {
      await markNotificationsRead(supabase, [item.id]).catch(() => {})
      await refreshPortalBadges()
    }
    const orderNumber = item.payload.orderNumber
    if (typeof orderNumber === 'string') await navigateTo(localePath(`/account/orders/${orderNumber}`))
  }

  async function markAll() {
    await markNotificationsRead(supabase)
    await refreshPortalBadges()
  }

  return { list, open, markAll }
}
