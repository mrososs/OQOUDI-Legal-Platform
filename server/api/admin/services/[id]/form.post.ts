import { z } from 'zod'
import { formFieldsSchema } from '#shared/domain/formSchema'

const bodySchema = z.object({ fields: formFieldsSchema })

/** Saves the editable draft form version (published versions are immutable). */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const serviceId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  const id = await callFn(event, 'admin_save_form_draft', {
    p_actor: actor.id,
    p_service: serviceId,
    p_fields: body.fields as never,
  })
  return { formVersionId: id }
})
