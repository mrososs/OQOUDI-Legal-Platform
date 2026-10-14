/**
 * Runs a staff mutation against /api/orders/:id/<action>, then refreshes
 * the page data and sidebar badges. Errors are surfaced as toasts and
 * returned so forms can show them inline.
 */
export function useDashboardOrderAction(orderId: MaybeRefOrGetter<string>, refresh: () => Promise<unknown>) {
  const { call, toFailure } = useApi()
  const toast = useToast()
  const busy = shallowRef<string | null>(null)

  async function run(action: string, body: Record<string, unknown> = {}, successMessage?: string): Promise<boolean> {
    busy.value = action
    try {
      await call(`/api/orders/${toValue(orderId)}/${action}`, { method: 'POST', body })
      await Promise.all([refresh(), refreshNuxtData('badge:dashboard')])
      if (successMessage) toast.show(successMessage)
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

  return { run, busy: readonly(busy) }
}
