import { availabilityRulesSchema } from '#shared/domain/serviceAdmin'

/** Replaces the platform consultation working hours. */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await readBody_(event, availabilityRulesSchema)
  await callFn(event, 'admin_set_availability_rules', { p_actor: actor.id, p_rules: body.rules as never })
  return { ok: true }
})
