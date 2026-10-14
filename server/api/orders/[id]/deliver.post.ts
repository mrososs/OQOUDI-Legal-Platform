import { z } from 'zod'

const bodySchema = z.object({
  note: z.string().trim().max(2000).optional(),
  documentIds: z.array(z.uuid()).min(1).max(10),
})

/** Publishes a new deliverable version (earlier versions are kept). */
export default defineEventHandler(async (event) => {
  const actor = await requireStaff(event)
  const orderId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  const version = await callFn(event, 'order_deliver', {
    p_actor: actor.id,
    p_order: orderId,
    p_note: (body.note ?? null) as string,
    p_document_ids: body.documentIds,
  })
  return { version }
})
