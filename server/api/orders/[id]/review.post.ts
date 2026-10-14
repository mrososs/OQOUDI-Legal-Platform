import { z } from 'zod'

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
})

/** One review per completed order (unique constraint + eligibility check in SQL). */
export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const orderId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  const id = await callFn(event, 'review_submit', {
    p_actor: actor.id,
    p_order: orderId,
    p_rating: body.rating,
    p_comment: (body.comment ?? null) as string,
  })
  return { id }
})
