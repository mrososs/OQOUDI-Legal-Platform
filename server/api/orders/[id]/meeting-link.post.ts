import { z } from 'zod'

const MEET_URL_RE = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/

const bodySchema = z.object({ url: z.string().trim().regex(MEET_URL_RE) })

/** Manual Google Meet link (validated here and again in SQL). */
export default defineEventHandler(async (event) => {
  const actor = await requireStaff(event)
  const orderId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  await callFn(event, 'booking_set_meeting_link', { p_actor: actor.id, p_order: orderId, p_url: body.url })
  return { ok: true }
})
