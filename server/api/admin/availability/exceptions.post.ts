import { availabilityExceptionSchema } from '#shared/domain/serviceAdmin'

/** Blocks a whole day (no times) or a time range on a Cairo date. */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await readBody_(event, availabilityExceptionSchema)
  const id = await callFn(event, 'admin_add_availability_exception', {
    p_actor: actor.id,
    p_date: body.date,
    p_start: (body.startTime ?? null) as string,
    p_end: (body.endTime ?? null) as string,
    p_reason: (body.reason ?? null) as string,
  })
  return { id }
})
