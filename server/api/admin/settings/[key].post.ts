import { SETTING_SCHEMAS, type SettingKey } from '#shared/domain/serviceAdmin'

/** Updates one whitelisted platform setting with a per-key schema. */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const key = getRouterParam(event, 'key') as SettingKey
  const schema = SETTING_SCHEMAS[key]
  if (!schema) throw appError('OQ404_SETTING')
  const body = await readBody(event).catch(() => null)
  const parsed = schema.safeParse(body?.value)
  if (!parsed.success) throw appError('OQ422_VALIDATION', zodFieldErrors(parsed.error))

  if (key === 'assignment.default_lawyer' && parsed.data && 'lawyer_id' in parsed.data && parsed.data.lawyer_id) {
    const roles = await actorRoles(event, parsed.data.lawyer_id)
    if (!roles.has('lawyer')) throw appError('OQ422_LAWYER_INVALID')
  }

  await callFn(event, 'admin_set_setting', { p_actor: actor.id, p_key: key, p_value: parsed.data as never })
  return { ok: true }
})
