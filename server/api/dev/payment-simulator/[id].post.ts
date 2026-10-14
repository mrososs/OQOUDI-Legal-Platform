import { z } from 'zod'
import { isProduction, simulatorSecret } from '../../../services/payments'
import { buildSimulatorWebhook, signSimulatorPayload, SIMULATOR_SIGNATURE_HEADER } from '../../../services/payments/simulator'

const bodySchema = z.object({ outcome: z.enum(['success', 'failure']) })

/**
 * DEV ONLY. Acts as the simulated gateway: after the customer chooses an
 * outcome on the simulator page, it emits a signed webhook to our own
 * webhook endpoint — exactly as an external provider would.
 */
export default defineEventHandler(async (event) => {
  if (isProduction() || useRuntimeConfig().payments.provider !== 'simulator') throw appError('OQ404')
  const actor = await requireUser(event)
  const paymentId = routeUuid(event)
  const { outcome } = await readBody_(event, bodySchema)

  const admin = adminClient(event)
  const { data: payment } = await admin
    .from('payments')
    .select('id, order_id, amount_minor, status, provider')
    .eq('id', paymentId)
    .maybeSingle()
  if (!payment || payment.provider !== 'simulator') throw appError('OQ404')
  const { data: order } = await admin.from('orders').select('customer_account_id').eq('id', payment.order_id).maybeSingle()
  const { data: member } = order
    ? await admin
        .from('customer_account_members')
        .select('user_id')
        .eq('account_id', order.customer_account_id)
        .eq('user_id', actor.id)
        .maybeSingle()
    : { data: null }
  if (!member) throw appError('OQ404')

  const webhook = buildSimulatorWebhook(payment.id, payment.amount_minor, outcome === 'success')
  const raw = JSON.stringify(webhook)
  const response = await $fetch<{ result: string }>('/api/payments/webhook/simulator', {
    method: 'POST',
    body: raw,
    headers: {
      'content-type': 'application/json',
      [SIMULATOR_SIGNATURE_HEADER]: signSimulatorPayload(raw, simulatorSecret()),
    },
  })
  return { result: response.result }
})
