import type { Database } from '#shared/types/database.types'
import { fetchNotifications, markNotificationsRead, type NotificationItem } from '~/repositories/account'

type ListKey = 'notifications:list' | 'notifications:recent' | 'notifications:staff'

/** Where a notification leads: customers to their order, staff to the dashboard (payments → review panel). */
export function notificationTarget(item: NotificationItem, audience: 'customer' | 'staff'): { path: string, query?: Record<string, string> } | null {
  const orderNumber = typeof item.payload.orderNumber === 'string' ? item.payload.orderNumber : null
  if (audience === 'staff') {
    if (item.type === 'payment.review_pending' && typeof item.payload.submissionId === 'string') {
      return { path: '/dashboard/payments', query: { review: item.payload.submissionId } }
    }
    return orderNumber ? { path: `/dashboard/requests/${orderNumber}` } : null
  }
  return orderNumber ? { path: `/account/orders/${orderNumber}` } : null
}

/** Notification list + "open" behaviour (mark read, go to the relevant screen). */
export function useAccountNotifications(key: ListKey, limit: number, audience: 'customer' | 'staff' = 'customer') {
  const supabase = useSupabaseClient<Database>()
  const localePath = useLocalePath()

  const list = useAsyncData(key, () => fetchNotifications(supabase, limit), { default: () => [] as NotificationItem[] })

  async function open(item: NotificationItem) {
    if (!item.readAt) {
      await markNotificationsRead(supabase, [item.id]).catch(() => {})
      await refreshPortalBadges()
      if (audience === 'staff') await list.refresh()
    }
    const target = notificationTarget(item, audience)
    if (target) await navigateTo(localePath(target))
  }

  async function markAll() {
    await markNotificationsRead(supabase)
    await refreshPortalBadges()
  }

  return { list, open, markAll }
}
