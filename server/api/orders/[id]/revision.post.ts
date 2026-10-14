import { z } from 'zod'

const bodySchema = z.object({ reason: z.string().trim().min(5).max(3000) })

/** Customer requests a revision of the latest delivery (delivered → revision). */
export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const orderId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  await callFn(event, 'order_request_revision', { p_actor: actor.id, p_order: orderId, p_reason: body.reason })
  return { status: 'revision' }
})
