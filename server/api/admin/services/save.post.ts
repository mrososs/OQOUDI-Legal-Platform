import { z } from 'zod'
import { serviceInputSchema } from '#shared/domain/serviceAdmin'

const bodySchema = z.object({
  id: z.uuid().nullish(),
  data: serviceInputSchema,
})

/**
 * Atomic save of service basics, pricing, categories, add-ons and page
 * sections (admin_save_service). New services start as drafts.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await readBody_(event, bodySchema)

  const { data, error } = await adminClient(event).rpc('admin_save_service', {
    p_actor: actor.id,
    p_service: (body.id ?? null) as string,
    p_data: body.data as never,
  })
  if (error) {
    if (error.code === '23505') throw appError('OQ409_SLUG_TAKEN', { slug: { code: 'slugTaken' } })
    if (error.code === '23503' || error.code === '23514' || error.code === '22P02') throw appError('OQ422_VALIDATION')
    throw fromDbError(error, 'admin_save_service')
  }
  return { id: data as string }
})
