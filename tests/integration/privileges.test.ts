import { describe, expect, it } from 'vitest'
import { anon, newCustomer, sql } from './helpers'

/** Structural guarantees that every future migration must keep. */
describe('database privilege baseline', () => {
  it('has RLS enabled on every public table', async () => {
    const rows = await sql<{ relname: string }>(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)
    expect(rows.map(r => r.relname)).toEqual([])
  })

  it('does not let API roles execute business functions', async () => {
    const allowed = ['available_slots', 'service_ratings', 'dashboard_kpis']
    const rows = await sql<{ fn: string, anon: boolean, auth: boolean }>(`
      select p.proname as fn,
             has_function_privilege('anon', p.oid, 'execute') as anon,
             has_function_privilege('authenticated', p.oid, 'execute') as auth
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prokind = 'f'`)
    const leaks = rows.filter(r => (r.anon || r.auth) && !allowed.includes(r.fn)).map(r => r.fn)
    expect(leaks).toEqual([])
  })

  it('gives API roles no direct write access to workflow tables', async () => {
    const rows = await sql<{ table_name: string, privilege_type: string }>(`
      select table_name, privilege_type from information_schema.role_table_grants
      where table_schema = 'public' and grantee in ('anon', 'authenticated')
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE')`)
    // Only column-level UPDATE grants exist (profiles, notifications), which do not show as table-level here.
    expect(rows).toEqual([])
  })

  it('keeps the document and payment-proof buckets private with no client storage policies', async () => {
    const buckets = await sql<{ id: string, public: boolean }>(`select id, public from storage.buckets where id in ('order-documents', 'payment-proofs') order by id`)
    expect(buckets).toEqual([{ id: 'order-documents', public: false }, { id: 'payment-proofs', public: false }])
    const policies = await sql(`select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'`)
    expect(policies).toEqual([])
  })

  it('rejects direct RPC calls to privileged functions from browsers', async () => {
    const customer = await newCustomer('rpc')
    const { error: anonErr } = await anon.rpc('payment_record_result', {
      p_provider: 'simulator', p_event_id: 'x', p_event_type: 'payment.succeeded',
      p_payment: '00000000-0000-0000-0000-000000000000', p_success: true, p_amount_minor: 1, p_failure_reason: '', p_payload: {},
    })
    expect(anonErr?.code).toBe('42501')
    const { error: userErr } = await customer.db.rpc('order_change_status', {
      p_actor: customer.userId, p_order: '00000000-0000-0000-0000-000000000000', p_to: 'completed', p_note: '',
    })
    expect(userErr?.code).toBe('42501')
  })

  it('never lets signup metadata grant privileged roles', async () => {
    const customer = await newCustomer('roles')
    const { data } = await customer.db.from('user_roles').select('role')
    expect(data?.map(r => r.role)).toEqual(['customer'])
    // and the client cannot insert roles
    const { error } = await customer.db.from('user_roles').insert({ user_id: customer.userId, role: 'admin' })
    expect(error).not.toBeNull()
  })
})
