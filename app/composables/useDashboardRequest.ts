import type { Database } from '#shared/types/database.types'
import type { OrderStatus } from '#shared/domain/orderStatus'
import { fetchOrderDetail } from '~/repositories/orders'
import { fetchActiveLawyers, fetchStaffExtras, type LawyerOption } from '~/repositories/dashboard'

/**
 * Request detail for staff: order (RLS — null if not assigned/admin),
 * staff extras and all staff actions wired to the server endpoints.
 */
export function useDashboardRequest(orderNumber: string) {
  const supabase = useSupabaseClient<Database>()
  const session = useSessionStore()
  const { t } = useI18n()

  const asyncData = useAsyncData(`dashboard:request:${orderNumber}`, async () => {
    const order = await fetchOrderDetail(supabase, orderNumber)
    if (!order) return null
    const [extras, lawyers] = await Promise.all([
      fetchStaffExtras(supabase, order.id, order.customerAccountId, order.formVersionId),
      session.isAdmin ? fetchActiveLawyers(supabase) : Promise.resolve([] as LawyerOption[]),
    ])
    return { order, extras, lawyers }
  })
  const { data, status, refresh } = asyncData
  /** Resolves once the initial (SSR) fetch completed. */
  const ready = Promise.resolve(asyncData).then(() => undefined)

  const orderId = computed(() => data.value?.order.id ?? '')
  const { run, busy } = useDashboardOrderAction(orderId, refresh)

  const actions = {
    changeStatus: (to: OrderStatus) => run('status', { status: to }, t('dashOps.toast.status')),
    requestInfo: (message: string) => run('request-info', { message }, t('dashOps.toast.infoRequested')),
    deliver: (p: { documentIds: string[], note: string }) => run('deliver', { documentIds: p.documentIds, note: p.note || undefined }, t('dashOps.toast.delivered')),
    publishResponse: (p: { body: string, documentIds: string[] }) => run('response', p, t('dashOps.toast.responseSent')),
    saveLink: (url: string) => run('meeting-link', { url }, t('dashOps.toast.linkSaved')),
    reschedule: (slotStart: string) => run('reschedule', { slotStart }, t('dashOps.toast.rescheduled')),
    complete: () => run('status', { status: 'completed' }, t('dashOps.toast.completed')),
    addNote: (body: string) => run('notes', { body }, t('dashOps.toast.noteAdded')),
    quote: (p: { amountMinor: number, note: string }) => run('quote', { amountMinor: p.amountMinor, note: p.note || undefined }, t('dashOps.toast.quoteSent')),
    assign: (lawyerId: string) => run('assign', { lawyerId }, t('dashOps.toast.assigned')),
    cancel: (reason: string) => run('cancel', { reason: reason || undefined }, t('dashOps.toast.cancelled')),
  }

  return { data, status, refresh, ready, busy, actions }
}
