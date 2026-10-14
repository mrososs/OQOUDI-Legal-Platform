/**
 * Publishes the service. A pending form draft becomes the next published
 * version; the previous version is retired (orders keep their version).
 */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const serviceId = routeUuid(event)
  const result = await callFn(event, 'admin_publish_service', { p_actor: actor.id, p_service: serviceId })
  return result as { formVersionId: string }
})
