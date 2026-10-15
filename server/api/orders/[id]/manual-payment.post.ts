import { z } from 'zod'
import { MANUAL_METHODS, PROOF_MAX_BYTES } from '#shared/domain/manualPayments'
import { assertMethodAvailable, assertOrderCustomer, resolvePaymentMode, verifyProofObject } from '../../../services/payments/manual'

const bodySchema = z.object({
  method: z.enum(MANUAL_METHODS),
  proofPath: z.string().min(10).max(300),
})

/**
 * Step 2: attaches a verified proof to the order and creates a submission
 * in `pending_review`. The amount comes from the order row; the demo flag
 * from server configuration. The order is NOT marked paid here — only an
 * admin approval does that.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  rateLimit(event, 'manual-payment', 20, 60 * 60 * 1000)
  const orderId = routeUuid(event)
  const { method, proofPath } = await readBody_(event, bodySchema)

  await assertOrderCustomer(event, actor.id, orderId)
  // Cheap shape check before touching storage; SQL enforces it again.
  if (!proofPath.startsWith(`${orderId}/${actor.id}/`)) throw appError('OQ422_PROOF_INVALID')
  await assertMethodAvailable(event, method)
  const proof = await verifyProofObject(event, proofPath)
  if (proof.size > PROOF_MAX_BYTES) throw appError('OQ422_PROOF_SIZE')

  return await callFn(event, 'manual_payment_submit', {
    p_actor: actor.id,
    p_order: orderId,
    p_method: method,
    p_proof_path: proofPath,
    p_proof_mime: proof.mime,
    p_proof_size: proof.size,
    p_demo: resolvePaymentMode() === 'manual_demo',
  }) as { submissionId: string, paymentId: string, orderNumber: string, amountMinor: number, status: 'pending_review' }
})
