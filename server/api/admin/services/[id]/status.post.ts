import { z } from 'zod'

const bodySchema = z.object({ status: z.enum(['draft', 'archived']) })

/** Unpublish (draft) or archive a service. Publishing uses /publish. */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const serviceId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  await callFn(event, 'admin_set_service_status', { p_actor: actor.id, p_service: serviceId, p_status: body.status })
  return { status: body.status }
})
