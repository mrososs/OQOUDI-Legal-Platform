import type { Database } from '#shared/types/database.types'
import { fetchOrders, type OrderListItem } from '~/repositories/orders'

/**
 * Orders of the signed-in customer's account. Filtering by account keeps
 * the portal limited to the user's own orders even when the user is also
 * staff (RLS would otherwise include orders assigned to them).
 */
export function useCustomerOrders() {
  const supabase = useSupabaseClient<Database>()
  const session = useSessionStore()
  return useAsyncData(
    'account:orders',
    async () => (session.account ? fetchOrders(supabase, { accountId: session.account.id }) : []),
    { default: () => [] as OrderListItem[], watch: [() => session.account?.id] },
  )
}

/** Refreshes portal-wide counters after a mutation. */
export function refreshPortalBadges() {
  return refreshNuxtData(['badge:unread', 'badge:active-orders', 'account:orders', 'notifications:recent', 'notifications:list'])
}
