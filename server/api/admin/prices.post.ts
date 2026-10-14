import { priceUpdateSchema } from '#shared/domain/serviceAdmin'

/** Batch price update. Existing orders keep their snapshot price. */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await readBody_(event, priceUpdateSchema)
  for (const p of body.prices) {
    if (p.pricingType === 'quote' && p.basePriceMinor <= 0) {
      throw appError('OQ422_VALIDATION', { [p.serviceId]: { code: 'quoteEstimate' } })
    }
  }
  const { data, error } = await adminClient(event).rpc('admin_update_prices', {
    p_actor: actor.id,
    p_prices: body.prices as never,
  })
  if (error) {
    // e.g. consultations must stay fixed-price (CHECK constraint)
    if (error.code === '23514') throw appError('OQ422_VALIDATION')
    throw fromDbError(error, 'admin_update_prices')
  }
  return { updated: data }
})
