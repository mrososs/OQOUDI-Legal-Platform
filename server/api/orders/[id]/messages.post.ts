import { z } from 'zod'

const bodySchema = z.object({
  body: z.string().trim().min(1).max(5000),
  documentIds: z.array(z.uuid()).max(5).default([]),
})

/** Customer or assigned staff message. A customer reply to an info request returns the order to review. */
export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  rateLimit(event, 'orders.message', 120, 60 * 60 * 1000)
  const orderId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  const id = await callFn(event, 'order_send_message', {
    p_actor: actor.id,
    p_order: orderId,
    p_body: body.body,
    p_document_ids: body.documentIds,
  })
  return { id }
})
