import { z } from 'zod'

const bodySchema = z.object({ orderId: z.uuid() })

/**
 * Approves a pending proof. Admin role is checked here and again inside
 * manual_payment_approve, which locks the rows, re-validates the order and
 * amount, and advances the order atomically. A second approval fails with
 * OQ409_PAYMENT_REVIEWED.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const submissionId = routeUuid(event)
  const { orderId } = await readBody_(event, bodySchema)
  return await callFn(event, 'manual_payment_approve', {
    p_actor: actor.id,
    p_submission: submissionId,
    p_order: orderId,
  }) as { result: 'approved', orderStatus: string, receiptNumber: string, lawyerAssigned: boolean }
})
