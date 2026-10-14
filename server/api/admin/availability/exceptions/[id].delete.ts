export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = routeUuid(event)
  await callFn(event, 'admin_remove_availability_exception', { p_actor: actor.id, p_id: id })
  return { ok: true }
})
