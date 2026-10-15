import { z } from 'zod'
import { assertOrderCustomer, createProofUpload } from '../../../services/payments/manual'

const bodySchema = z.object({
  fileName: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  mimeType: z.string().max(100).optional(),
})

/**
 * Step 1 of a proof submission: issues a signed upload URL into the private
 * `payment-proofs` bucket. Nothing is recorded yet; the object is verified
 * and attached in POST /api/orders/:id/manual-payment.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  rateLimit(event, 'payment-proof', 30, 60 * 60 * 1000)
  const orderId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  const order = await assertOrderCustomer(event, actor.id, orderId)
  if (order.status !== 'awaiting_payment' || !['unpaid', 'failed'].includes(order.payment_status)) {
    throw appError('OQ409_NOT_PAYABLE')
  }
  return await createProofUpload(event, actor.id, orderId, body)
})
