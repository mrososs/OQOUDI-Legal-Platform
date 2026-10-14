import { z } from 'zod'

const bodySchema = z.object({ body: z.string().trim().min(1).max(5000) })

/** Internal staff note (never visible to customers). */
export default defineEventHandler(async (event) => {
  const actor = await requireStaff(event)
  const orderId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  const id = await callFn(event, 'order_add_note', { p_actor: actor.id, p_order: orderId, p_body: body.body })
  return { id }
})
