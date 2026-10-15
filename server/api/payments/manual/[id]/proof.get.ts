import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '#shared/types/database.types'
import { signProofUrl } from '../../../../services/payments/manual'

/**
 * Short-lived (60 s) preview URL for a payment proof. The lookup runs with
 * the caller's RLS-scoped client: only the order's customers and admins can
 * see a submission; lawyers and everyone else get a 404.
 */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = routeUuid(event)
  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await client
    .from('manual_payment_submissions')
    .select('id, proof_storage_path')
    .eq('id', id)
    .maybeSingle()
  if (error) throw fromDbError(error, 'manual_payment_submissions.select')
  if (!data) throw appError('OQ404_PAYMENT')
  setResponseHeader(event, 'cache-control', 'private, no-store')
  return await signProofUrl(event, data.proof_storage_path)
})
