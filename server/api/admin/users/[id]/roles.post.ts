import { z } from 'zod'

const bodySchema = z.object({
  role: z.enum(['lawyer', 'admin']),
  grant: z.boolean(),
  displayName: z.string().trim().max(120).optional(),
})

/** Grant / revoke privileged roles (audited in SQL; self-demotion blocked). */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const userId = routeUuid(event)
  const body = await readBody_(event, bodySchema)
  await callFn(event, 'admin_set_user_role', {
    p_actor: actor.id,
    p_user: userId,
    p_role: body.role,
    p_grant: body.grant,
    p_display_name: body.displayName,
  })
  return { ok: true }
})
