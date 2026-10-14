import { z } from 'zod'

const bodySchema = z.object({
  amountMinor: z.number().int().positive().max(100000000000),
  note: z.string().trim().max(500).optional(),
})

/** Admin issues the final price for a quote-based order (→ awaiting_payment). */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const orderId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  await callFn(event, 'order_issue_quote', {
    p_actor: actor.id,
    p_order: orderId,
    p_amount_minor: body.amountMinor,
    p_note: (body.note ?? null) as string,
  })
  return { status: 'awaiting_payment' }
})
