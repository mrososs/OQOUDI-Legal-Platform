import { z } from 'zod'

const bodySchema = z.object({ reason: z.string().trim().max(1000).optional() })

/** Customer (before payment/work) or admin cancellation; rules in order_cancel. */
export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const orderId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  await callFn(event, 'order_cancel', { p_actor: actor.id, p_order: orderId, p_reason: (body.reason ?? null) as string })
  return { status: 'cancelled' }
})
