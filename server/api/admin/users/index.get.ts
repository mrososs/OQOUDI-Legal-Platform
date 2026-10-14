import { z } from 'zod'

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
})

/**
 * Admin-only user directory (minimal fields) for role management.
 * Uses the service role because admins need to see users that have no
 * relation to them; the route itself is the access check.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const parsed = querySchema.safeParse(getQuery(event))
  const q = parsed.success ? parsed.data.q : undefined
  const admin = adminClient(event)

  let query = admin
    .from('profiles')
    .select('id, full_name, email, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (q) {
    const safe = q.replace(/[%,()]/g, ' ')
    query = query.or(`email.ilike.%${safe}%,full_name.ilike.%${safe}%`)
  }
  const { data: profiles, error } = await query
  if (error) throw fromDbError(error, 'profiles.select')

  const ids = (profiles ?? []).map(p => p.id)
  const [rolesRes, lawyersRes] = await Promise.all([
    ids.length ? admin.from('user_roles').select('user_id, role').in('user_id', ids) : Promise.resolve({ data: [], error: null }),
    ids.length ? admin.from('lawyer_profiles').select('user_id, display_name, is_active').in('user_id', ids) : Promise.resolve({ data: [], error: null }),
  ])
  if (rolesRes.error) throw fromDbError(rolesRes.error, 'user_roles.select')

  const roles = new Map<string, string[]>()
  for (const r of rolesRes.data ?? []) roles.set(r.user_id, [...(roles.get(r.user_id) ?? []), r.role])
  const lawyers = new Map((lawyersRes.data ?? []).map(l => [l.user_id, l]))

  return (profiles ?? []).map(p => ({
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    createdAt: p.created_at,
    roles: roles.get(p.id) ?? [],
    lawyerDisplayName: lawyers.get(p.id)?.display_name ?? null,
  }))
})
