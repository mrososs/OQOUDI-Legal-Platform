import { getSubmission } from '../../../../services/payments/adminReview'

/** Admin: one submission with customer and order details (for the review panel / deep links). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return await getSubmission(event, routeUuid(event))
})
