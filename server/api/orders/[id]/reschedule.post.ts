import { z } from 'zod'

const bodySchema = z.object({ slotStart: z.iso.datetime({ offset: true }) })

/** Customer (≥ 24 h before) or staff reschedule; slot availability re-checked in SQL. */
export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const orderId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  await callFn(event, 'booking_reschedule', { p_actor: actor.id, p_order: orderId, p_new_start: body.slotStart })
  return { ok: true }
})
