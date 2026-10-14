/** Discards the unpublished form draft. */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const serviceId = routeUuid(event)
  await callFn(event, 'admin_discard_form_draft', { p_actor: actor.id, p_service: serviceId })
  return { ok: true }
})
