import { z } from 'zod'

const bodySchema = z.object({ reply: z.string().trim().max(2000) })

/**
 * Public reply under a review. Admins: any review; lawyers: reviews on
 * orders assigned to them (enforced by review_reply). Review text itself
 * can never be edited.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireStaff(event)
  const reviewId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  await callFn(event, 'review_reply', { p_actor: actor.id, p_review: reviewId, p_reply: body.reply })
  return { ok: true }
})
