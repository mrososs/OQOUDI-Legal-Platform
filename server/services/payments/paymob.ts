import type { PaymentProvider } from './types'

/**
 * Paymob adapter — NOT IMPLEMENTED (blocked on credentials).
 * See docs/integrations.md for the checklist. Every method throws so the
 * platform can never silently pretend a Paymob payment happened.
 */
export function createPaymobProvider(config: { apiKey: string, hmacSecret: string }): PaymentProvider {
  const notConfigured = () => {
    const missing = !config.apiKey || !config.hmacSecret
    return new Error(missing ? 'paymob_not_configured' : 'paymob_not_implemented')
  }
  return {
    id: 'paymob',
    async createCheckout() {
      throw notConfigured()
    },
    async verifyWebhook() {
      throw notConfigured()
    },
  }
}
