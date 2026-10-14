import { z } from 'zod'
import { ORDER_STATUSES } from '#shared/domain/orderStatus'

const bodySchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
})

/** Generic staff transition; legality is enforced by order_change_status. */
export default defineEventHandler(async (event) => {
  const actor = await requireStaff(event)
  const orderId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  const status = await callFn(event, 'order_change_status', {
    p_actor: actor.id,
    p_order: orderId,
    p_to: body.status,
    p_note: (body.note ?? null) as string,
  })
  return { status }
})
