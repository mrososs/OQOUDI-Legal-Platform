import { z } from 'zod'

const bodySchema = z.object({
  orderId: z.uuid(),
  reason: z.string().trim().max(500).optional(),
})

/** Rejects a pending proof; the order stays blocked and the evidence is kept. */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const submissionId = routeUuid(event)
  const { orderId, reason } = await readBody_(event, bodySchema)
  return await callFn(event, 'manual_payment_reject', {
    p_actor: actor.id,
    p_submission: submissionId,
    p_order: orderId,
    p_reason: (reason || null) as string,
  }) as { result: 'rejected', remainingAttempts: number }
})
