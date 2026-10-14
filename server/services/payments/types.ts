import type { H3Event } from 'h3'

export type PaymentMethod = 'card' | 'wallet' | 'fawry'
export type ProviderId = 'simulator' | 'paymob'

export interface CheckoutInput {
  paymentId: string
  orderNumber: string
  amountMinor: number
  currency: 'EGP'
  method: PaymentMethod
  customer: { email: string | null, name: string, phone: string | null }
  /** Where the provider sends the browser afterwards (status is NOT trusted from it). */
  returnUrl: string
}

export interface CheckoutSession {
  providerReference: string
  /** Hosted payment page / iframe URL. */
  redirectUrl: string
}

/** A provider callback that passed authenticity verification. */
export interface VerifiedPaymentEvent {
  eventId: string
  eventType: string
  paymentId: string
  success: boolean
  amountMinor: number
  failureReason: string | null
  /** Sanitized payload stored for audit (no card data). */
  payload: Record<string, unknown>
}

export interface PaymentProvider {
  readonly id: ProviderId
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>
  /** Throws if the request is not authentic. */
  verifyWebhook(event: H3Event, rawBody: string): Promise<VerifiedPaymentEvent>
}
