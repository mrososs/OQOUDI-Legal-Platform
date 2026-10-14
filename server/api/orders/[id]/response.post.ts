import { z } from 'zod'

const bodySchema = z.object({
  body: z.string().trim().min(20).max(20000),
  documentIds: z.array(z.uuid()).max(10).default([]),
})

/** Publishes the written consultation answer to the customer. */
export default defineEventHandler(async (event) => {
  const actor = await requireStaff(event)
  const orderId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  const version = await callFn(event, 'order_publish_response', {
    p_actor: actor.id,
    p_order: orderId,
    p_body: body.body,
    p_document_ids: body.documentIds,
  })
  return { version }
})
