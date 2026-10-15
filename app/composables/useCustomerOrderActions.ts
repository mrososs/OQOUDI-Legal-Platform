import type { OrderDetail } from '~/repositories/orders'

/**
 * Customer mutations on an order. Each goes through the server (which
 * calls the guarded business function) and then refreshes the page data
 * and portal counters.
 */
export function useCustomerOrderActions(order: Ref<OrderDetail | null | undefined>, refresh: () => Promise<unknown>) {
  const { t } = useI18n()
  const { call, toFailure } = useApi()
  const toast = useToast()
  const busy = shallowRef<string | null>(null)

  async function run(name: string, path: string, body: Record<string, unknown> | undefined, success: string): Promise<boolean> {
    if (!order.value) return false
    busy.value = name
    try {
      await call(`/api/orders/${order.value.id}/${path}`, { method: 'POST', body: body ?? {} })
      await Promise.all([refresh(), refreshPortalBadges()])
      toast.success(success)
      return true
    }
    catch (err) {
      toast.error(toFailure(err).message)
      return false
    }
    finally {
      busy.value = null
    }
  }

  return {
    busy,
    accept: () => run('accept', 'accept', undefined, t('account.toasts.accepted')),
    requestRevision: (reason: string) => run('revision', 'revision', { reason }, t('account.toasts.revisionSent')),
    cancel: (reason?: string) => run('cancel', 'cancel', { reason }, t('account.toasts.cancelled')),
    reschedule: (slotStart: string) => run('reschedule', 'reschedule', { slotStart }, t('account.toasts.rescheduled')),
    review: (rating: number, comment: string) => run('review', 'review', { rating, comment: comment || undefined }, t('account.toasts.reviewed')),
  }
}
