import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { z } from 'zod'
import type { CheckoutInput, CheckoutSession, PaymentProvider, VerifiedPaymentEvent } from './types'

/**
 * LOCAL DEVELOPMENT PAYMENT SIMULATOR — not a real gateway.
 * Imitates a hosted payment page and sends HMAC-signed webhooks through the
 * same verification + idempotent recording pipeline a real provider uses.
 * The factory refuses to create it in production.
 */
export const SIMULATOR_SIGNATURE_HEADER = 'x-oq-simulator-signature'

const webhookSchema = z.object({
  eventId: z.string().min(8).max(100),
  type: z.enum(['payment.succeeded', 'payment.failed']),
  paymentId: z.uuid(),
  amountMinor: z.number().int().positive(),
  failureReason: z.string().max(300).nullable(),
  createdAt: z.string(),
})
export type SimulatorWebhook = z.infer<typeof webhookSchema>

export function signSimulatorPayload(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
}

export function buildSimulatorWebhook(paymentId: string, amountMinor: number, success: boolean): SimulatorWebhook {
  return {
    eventId: `sim_${randomUUID()}`,
    type: success ? 'payment.succeeded' : 'payment.failed',
    paymentId,
    amountMinor,
    failureReason: success ? null : 'card_declined_by_issuer',
    createdAt: new Date().toISOString(),
  }
}

export function createSimulatorProvider(secret: string, siteUrl: string): PaymentProvider {
  return {
    id: 'simulator',

    async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
      const reference = `SIM-${input.orderNumber}-${input.paymentId.slice(0, 8)}`
      const url = new URL(`/dev/payment-simulator/${input.paymentId}`, siteUrl)
      url.searchParams.set('return', input.returnUrl)
      return { providerReference: reference, redirectUrl: url.pathname + url.search }
    },

    async verifyWebhook(event: H3Event, rawBody: string): Promise<VerifiedPaymentEvent> {
      const signature = getHeader(event, SIMULATOR_SIGNATURE_HEADER) ?? ''
      const expected = signSimulatorPayload(rawBody, secret)
      const a = Buffer.from(signature, 'hex')
      const b = Buffer.from(expected, 'hex')
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new Error('invalid_signature')
      }
      const parsed = webhookSchema.parse(JSON.parse(rawBody))
      return {
        eventId: parsed.eventId,
        eventType: parsed.type,
        paymentId: parsed.paymentId,
        success: parsed.type === 'payment.succeeded',
        amountMinor: parsed.amountMinor,
        failureReason: parsed.failureReason,
        payload: { ...parsed },
      }
    },
  }
}
