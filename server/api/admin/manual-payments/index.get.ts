import { z } from 'zod'
import { MANUAL_METHODS, VERIFICATION_STATUSES } from '#shared/domain/manualPayments'
import { listSubmissions, submissionKpis } from '../../../services/payments/adminReview'

const querySchema = z.object({
  status: z.enum(VERIFICATION_STATUSES).optional(),
  method: z.enum(MANUAL_METHODS).optional(),
  q: z.string().max(80).optional(),
  sort: z.enum(['submitted_at', 'amount']).default('submitted_at'),
  dir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
})

/** Admin: manual payment submissions (server-side filter/sort/pagination) + KPI counters. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) throw appError('OQ422_VALIDATION', zodFieldErrors(parsed.error))
  const [list, kpis] = await Promise.all([listSubmissions(event, parsed.data), submissionKpis(event)])
  return { ...list, page: parsed.data.page, pageSize: parsed.data.pageSize, kpis }
})
