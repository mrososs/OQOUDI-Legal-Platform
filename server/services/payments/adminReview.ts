import type { H3Event } from 'h3'
import type { ManualMethod, VerificationStatus } from '#shared/domain/manualPayments'
import type { Localized } from '#shared/domain/localized'

/**
 * Admin read model for manual payment verification. Callers must have
 * passed requireAdmin(); queries use the service role with explicit
 * filters (lawyers never reach this module).
 */
const SELECT = `id, order_id, payment_id, payment_method, expected_amount_minor, currency, verification_status,
  demo_mode, submitted_at, reviewed_at, rejection_reason, proof_mime_type, proof_size_bytes,
  orders!inner(order_number, status, payment_status, service_snapshot, total_minor),
  submitter:profiles!manual_payment_submissions_submitted_by_fkey(full_name, email, phone),
  reviewer:profiles!manual_payment_submissions_reviewed_by_fkey(full_name)`

interface Row {
  id: string
  order_id: string
  payment_id: string
  payment_method: ManualMethod
  expected_amount_minor: number
  currency: string
  verification_status: VerificationStatus
  demo_mode: boolean
  submitted_at: string
  reviewed_at: string | null
  rejection_reason: string | null
  proof_mime_type: string
  proof_size_bytes: number
  orders: { order_number: string, status: string, payment_status: string, service_snapshot: { title?: Localized, kind?: string }, total_minor: number }
  submitter: { full_name: string, email: string, phone: string | null } | null
  reviewer: { full_name: string } | null
}

export interface AdminSubmission {
  id: string
  orderId: string
  orderNumber: string
  orderStatus: string
  orderPaymentStatus: string
  orderTotalMinor: number
  serviceTitle: Localized | null
  serviceKind: string | null
  method: ManualMethod
  amountMinor: number
  currency: string
  status: VerificationStatus
  demo: boolean
  submittedAt: string
  reviewedAt: string | null
  reviewerName: string | null
  rejectionReason: string | null
  proofMime: string
  proofSizeBytes: number
  customer: { name: string, email: string, phone: string | null }
}

function toSubmission(r: Row): AdminSubmission {
  return {
    id: r.id,
    orderId: r.order_id,
    orderNumber: r.orders.order_number,
    orderStatus: r.orders.status,
    orderPaymentStatus: r.orders.payment_status,
    orderTotalMinor: r.orders.total_minor,
    serviceTitle: r.orders.service_snapshot?.title ?? null,
    serviceKind: r.orders.service_snapshot?.kind ?? null,
    method: r.payment_method,
    amountMinor: r.expected_amount_minor,
    currency: r.currency,
    status: r.verification_status,
    demo: r.demo_mode,
    submittedAt: r.submitted_at,
    reviewedAt: r.reviewed_at,
    reviewerName: r.reviewer?.full_name ?? null,
    rejectionReason: r.rejection_reason,
    proofMime: r.proof_mime_type,
    proofSizeBytes: r.proof_size_bytes,
    customer: { name: r.submitter?.full_name ?? '—', email: r.submitter?.email ?? '', phone: r.submitter?.phone ?? null },
  }
}

export interface ListQuery {
  status?: VerificationStatus
  method?: ManualMethod
  q?: string
  sort: 'submitted_at' | 'amount'
  dir: 'asc' | 'desc'
  page: number
  pageSize: number
}

/** PostgREST `in` list of quoted uuids. */
const inList = (ids: string[]) => `(${ids.map(id => `"${id}"`).join(',')})`

export async function listSubmissions(event: H3Event, query: ListQuery) {
  const admin = adminClient(event)
  let q = admin.from('manual_payment_submissions').select(SELECT, { count: 'exact' })
  if (query.status) q = q.eq('verification_status', query.status)
  if (query.method) q = q.eq('payment_method', query.method)

  const term = query.q?.trim().replace(/[%,()"]/g, '')
  if (term) {
    const [orders, people] = await Promise.all([
      admin.from('orders').select('id').ilike('order_number', `%${term}%`).limit(200),
      admin.from('profiles').select('id').or(`full_name.ilike.%${term}%,email.ilike.%${term}%`).limit(200),
    ])
    const orderIds = (orders.data ?? []).map(o => o.id)
    const userIds = (people.data ?? []).map(p => p.id)
    if (!orderIds.length && !userIds.length) return { rows: [] as AdminSubmission[], total: 0 }
    const parts = [
      orderIds.length ? `order_id.in.${inList(orderIds)}` : '',
      userIds.length ? `submitted_by.in.${inList(userIds)}` : '',
    ].filter(Boolean)
    q = q.or(parts.join(','))
  }

  const from = (query.page - 1) * query.pageSize
  const { data, error, count } = await q
    .order(query.sort === 'amount' ? 'expected_amount_minor' : 'submitted_at', { ascending: query.dir === 'asc' })
    .order('id')
    .range(from, from + query.pageSize - 1)
  if (error) throw fromDbError(error, 'manual_payment_submissions.list')
  return { rows: ((data ?? []) as unknown as Row[]).map(toSubmission), total: count ?? 0 }
}

export async function getSubmission(event: H3Event, id: string): Promise<AdminSubmission> {
  const { data, error } = await adminClient(event).from('manual_payment_submissions').select(SELECT).eq('id', id).maybeSingle()
  if (error) throw fromDbError(error, 'manual_payment_submissions.get')
  if (!data) throw appError('OQ404_PAYMENT')
  return toSubmission(data as unknown as Row)
}

/**
 * KPI cards. Demo approvals are reported separately and never as real
 * collected revenue.
 */
export async function submissionKpis(event: H3Event) {
  const { data, error } = await adminClient(event)
    .from('manual_payment_submissions')
    .select('verification_status, expected_amount_minor, demo_mode')
    .limit(10000)
  if (error) throw fromDbError(error, 'manual_payment_submissions.kpis')
  const out = { pending: 0, approved: 0, rejected: 0, pendingAmountMinor: 0, approvedDemoAmountMinor: 0, approvedRealAmountMinor: 0 }
  for (const r of data ?? []) {
    if (r.verification_status === 'pending_review') {
      out.pending++
      out.pendingAmountMinor += r.expected_amount_minor
    }
    else if (r.verification_status === 'approved') {
      out.approved++
      if (r.demo_mode) out.approvedDemoAmountMinor += r.expected_amount_minor
      else out.approvedRealAmountMinor += r.expected_amount_minor
    }
    else {
      out.rejected++
    }
  }
  return out
}
