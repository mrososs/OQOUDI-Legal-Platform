import type { Database } from '#shared/types/database.types'
import { ACTIVE_STATUSES } from '#shared/domain/orderStatus'

/** Unread notification count for the current user (RLS: own rows only). */
export function useNotificationsBadge() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { data, refresh } = useAsyncData(
    'badge:unread',
    async () => {
      if (!user.value) return 0
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
      return count ?? 0
    },
    { default: () => 0, watch: [() => user.value?.sub] },
  )
  return { unreadCount: computed(() => data.value ?? 0), refreshUnread: refresh }
}

/** Active orders of the current customer account (portal sidebar). */
export function useActiveOrdersCount() {
  const supabase = useSupabaseClient<Database>()
  const session = useSessionStore()
  const { data, refresh } = useAsyncData(
    'badge:active-orders',
    async () => {
      if (!session.account) return 0
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_account_id', session.account.id)
        .in('status', [...ACTIVE_STATUSES])
      return count ?? 0
    },
    { default: () => 0, watch: [() => session.account?.id] },
  )
  return { activeCount: computed(() => data.value ?? 0), refreshActive: refresh }
}

/** Lawyer sidebar counters (RLS scopes to assigned orders unless admin). */
export function useDashboardBadges() {
  const supabase = useSupabaseClient<Database>()
  const session = useSessionStore()
  const { data, refresh } = useAsyncData(
    'badge:dashboard',
    async () => {
      if (!session.isStaff) return { newRequests: 0, missingLinks: 0, unrepliedReviews: 0, pendingPayments: 0 }
      const nowIso = new Date().toISOString()
      const [requests, links, reviews, payments] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['new', 'under_review']),
        supabase
          .from('consultation_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'confirmed')
          .is('meeting_url', null)
          .gte('starts_at', nowIso),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).is('reply', null),
        // RLS: admins see all submissions, lawyers none (count 0).
        supabase.from('manual_payment_submissions').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending_review'),
      ])
      return {
        newRequests: requests.count ?? 0,
        missingLinks: links.count ?? 0,
        unrepliedReviews: reviews.count ?? 0,
        pendingPayments: payments.count ?? 0,
      }
    },
    { default: () => ({ newRequests: 0, missingLinks: 0, unrepliedReviews: 0, pendingPayments: 0 }), watch: [() => session.isStaff] },
  )
  return { counts: computed(() => data.value ?? { newRequests: 0, missingLinks: 0, unrepliedReviews: 0, pendingPayments: 0 }), refreshBadges: refresh }
}
