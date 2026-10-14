import type { H3Event } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { Database } from '#shared/types/database.types'

export interface Actor {
  id: string
  email: string | null
}

/**
 * Validates the session JWT server-side (signature + expiry via Supabase
 * Auth). Never trusts any role/user value sent by the browser.
 */
export async function requireUser(event: H3Event): Promise<Actor> {
  const claims = await serverSupabaseUser(event).catch(() => null)
  if (!claims?.sub) throw appError('OQ401')
  return { id: claims.sub, email: (claims.email as string | undefined) ?? null }
}

/** Service-role client. Server-only; bypasses RLS — use with explicit checks. */
export function adminClient(event: H3Event) {
  return serverSupabaseServiceRole<Database>(event)
}

export async function actorRoles(event: H3Event, actorId: string): Promise<Set<string>> {
  const { data, error } = await adminClient(event).from('user_roles').select('role').eq('user_id', actorId)
  if (error) throw fromDbError(error, 'roles')
  return new Set((data ?? []).map(r => r.role))
}

export async function requireAdmin(event: H3Event): Promise<Actor> {
  const actor = await requireUser(event)
  const roles = await actorRoles(event, actor.id)
  if (!roles.has('admin')) throw appError('OQ403')
  return actor
}

export async function requireStaff(event: H3Event): Promise<Actor> {
  const actor = await requireUser(event)
  const roles = await actorRoles(event, actor.id)
  if (!roles.has('admin') && !roles.has('lawyer')) throw appError('OQ403')
  return actor
}

type Functions = Database['public']['Functions']

/** Calls a SECURITY DEFINER business function with the service role. */
export async function callFn<K extends keyof Functions>(
  event: H3Event,
  fn: K,
  args: Functions[K]['Args'],
): Promise<Functions[K]['Returns']> {
  const { data, error } = await adminClient(event).rpc(fn, args as never)
  if (error) throw fromDbError(error, String(fn))
  return data as Functions[K]['Returns']
}
