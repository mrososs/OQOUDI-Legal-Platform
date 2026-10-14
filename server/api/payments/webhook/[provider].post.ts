import { getPaymentProvider } from '../../../services/payments'
import type { ProviderId } from '../../../services/payments/types'

/**
 * Provider callbacks. The ONLY path that can mark a payment succeeded.
 * 1. authenticity verified by the provider adapter (HMAC)
 * 2. recorded idempotently (unique provider event id)
 * 3. amount re-checked against the stored attempt in SQL
 */
export default defineEventHandler(async (event) => {
  const providerParam = getRouterParam(event, 'provider')
  if (providerParam !== 'simulator' && providerParam !== 'paymob') throw appError('OQ404')
  const provider = getPaymentProvider(providerParam as ProviderId)

  const rawBody = (await readRawBody(event, 'utf8')) ?? ''
  if (rawBody.length > 64 * 1024) throw appError('OQ400')

  let verified
  try {
    verified = await provider.verifyWebhook(event, rawBody)
  }
  catch (err) {
    console.warn('[payments] rejected webhook', { provider: providerParam, reason: (err as Error).message })
    throw appError('OQ401')
  }

  const result = await callFn(event, 'payment_record_result', {
    p_provider: provider.id,
    p_event_id: verified.eventId,
    p_event_type: verified.eventType,
    p_payment: verified.paymentId,
    p_success: verified.success,
    p_amount_minor: verified.amountMinor,
    p_failure_reason: verified.failureReason as string,
    p_payload: verified.payload as never,
  })

  return { received: true, result }
})
