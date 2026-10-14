/** Customer accepts the delivered work (delivered → completed). */
export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const orderId = routeUuid(event)
  await callFn(event, 'order_accept_delivery', { p_actor: actor.id, p_order: orderId })
  return { status: 'completed' }
})
