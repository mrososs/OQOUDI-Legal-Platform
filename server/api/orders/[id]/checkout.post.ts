import { z } from 'zod'
import { activeProviderId, getPaymentProvider } from '../../../services/payments'

const bodySchema = z.object({
  method: z.enum(['card', 'wallet', 'fawry']),
})

/**
 * Starts a checkout attempt. The amount always comes from the order row
 * (server-calculated); the browser only chooses the method. Returns the
 * provider's hosted page URL. The order is NOT marked paid here.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  rateLimit(event, 'checkout', 30, 60 * 60 * 1000)
  const orderId = routeUuid(event)
  const { method } = await readBody_(event, bodySchema)

  const providerId = activeProviderId()
  const provider = getPaymentProvider(providerId)

  const started = await callFn(event, 'payment_start', {
    p_actor: actor.id,
    p_order: orderId,
    p_method: method,
    p_provider: providerId,
  }) as { paymentId: string, amountMinor: number, currency: 'EGP', orderNumber: string }

  const { data: profile } = await adminClient(event)
    .from('profiles')
    .select('full_name, phone')
    .eq('id', actor.id)
    .maybeSingle()

  const siteUrl = useRuntimeConfig().public.siteUrl
  let session
  try {
    session = await provider.createCheckout({
      paymentId: started.paymentId,
      orderNumber: started.orderNumber,
      amountMinor: started.amountMinor,
      currency: 'EGP',
      method,
      customer: { email: actor.email, name: profile?.full_name ?? '', phone: profile?.phone ?? null },
      returnUrl: `${siteUrl}/checkout/${started.orderNumber}/confirmation?payment=${started.paymentId}`,
    })
  }
  catch (err) {
    console.error('[payments] createCheckout failed', { provider: providerId, error: (err as Error).message })
    throw appError('OQ503_PAYMENTS')
  }

  await callFn(event, 'payment_attach_reference', {
    p_payment: started.paymentId,
    p_reference: session.providerReference,
  })

  return { paymentId: started.paymentId, redirectUrl: session.redirectUrl }
})
