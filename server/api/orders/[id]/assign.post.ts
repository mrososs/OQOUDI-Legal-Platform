import { z } from 'zod'

const bodySchema = z.object({ lawyerId: z.uuid() })

/** Admin assigns / reassigns the responsible lawyer (audited). */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const orderId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  await callFn(event, 'order_assign_lawyer', { p_actor: actor.id, p_order: orderId, p_lawyer: body.lawyerId })
  return { ok: true }
})
