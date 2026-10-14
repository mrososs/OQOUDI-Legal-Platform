import { z } from 'zod'

const bodySchema = z.object({ message: z.string().trim().min(5).max(5000) })

/** Lawyer asks the customer for more information (→ awaiting_info + message). */
export default defineEventHandler(async (event) => {
  const actor = await requireStaff(event)
  const orderId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  await callFn(event, 'order_request_info', { p_actor: actor.id, p_order: orderId, p_message: body.message })
  return { status: 'awaiting_info' }
})
