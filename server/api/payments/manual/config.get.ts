import { manualPaymentConfig } from '../../../services/payments/manual'

/** Payment mode + transfer destinations for the checkout (signed-in users only). */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  return await manualPaymentConfig(event)
})
