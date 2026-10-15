import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/types/database.types'
import type { Localized } from '#shared/domain/localized'
import type { VerificationStatus } from '#shared/domain/manualPayments'

type Client = SupabaseClient<Database>

export interface NotificationItem {
  id: string
  type: string
  orderId: string | null
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export interface PaymentRow {
  id: string
  status: Database['public']['Enums']['payment_attempt_status']
  method: Database['public']['Enums']['payment_method']
  amountMinor: number
  receiptNumber: string | null
  createdAt: string
  succeededAt: string | null
  orderNumber: string
  orderStatus: Database['public']['Enums']['order_status']
  orderPaymentStatus: Database['public']['Enums']['payment_status']
  serviceTitle: Localized | null
  provider: string
  isDemo: boolean
  /** Manual transfers: the proof review attached to this attempt. */
  verification: { submissionId: string, status: VerificationStatus, rejectionReason: string | null } | null
}

/** Current user's notifications (RLS: own rows only). */
export async function fetchNotifications(client: Client, limit = 50): Promise<NotificationItem[]> {
  const { data, error } = await client
    .from('notifications')
    .select('id, type, order_id, payload, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(n => ({
    id: n.id,
    type: n.type,
    orderId: n.order_id,
    payload: (n.payload ?? {}) as Record<string, unknown>,
    readAt: n.read_at,
    createdAt: n.created_at,
  }))
}

/** Marks notifications read (column-level grant on read_at + RLS own rows). */
export async function markNotificationsRead(client: Client, ids?: string[]) {
  let q = client.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
  if (ids?.length) q = q.in('id', ids)
  const { error } = await q
  if (error) throw error
}

/** Payment attempts of the customer's own orders (RLS). */
export async function fetchCustomerPayments(client: Client, accountId: string): Promise<PaymentRow[]> {
  const { data, error } = await client
    .from('payments')
    .select('id, status, method, provider, is_demo, amount_minor, receipt_number, created_at, succeeded_at, orders!inner(order_number, status, payment_status, service_snapshot, customer_account_id), manual_payment_submissions(id, verification_status, rejection_reason)')
    .eq('orders.customer_account_id', accountId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((p) => {
    const o = (Array.isArray(p.orders) ? p.orders[0] : p.orders) as {
      order_number: string
      status: PaymentRow['orderStatus']
      payment_status: PaymentRow['orderPaymentStatus']
      service_snapshot: { title?: Localized } | null
    }
    const sub = (Array.isArray(p.manual_payment_submissions) ? p.manual_payment_submissions[0] : p.manual_payment_submissions) as
      { id: string, verification_status: VerificationStatus, rejection_reason: string | null } | null | undefined
    return {
      id: p.id,
      status: p.status,
      method: p.method,
      amountMinor: p.amount_minor,
      receiptNumber: p.receipt_number,
      createdAt: p.created_at,
      succeededAt: p.succeeded_at,
      orderNumber: o.order_number,
      orderStatus: o.status,
      orderPaymentStatus: o.payment_status,
      serviceTitle: o.service_snapshot?.title ?? null,
      provider: p.provider,
      isDemo: p.is_demo,
      verification: sub ? { submissionId: sub.id, status: sub.verification_status, rejectionReason: sub.rejection_reason } : null,
    }
  })
}

export async function fetchLawyerName(client: Client, lawyerId: string | null): Promise<string | null> {
  if (!lawyerId) return null
  const { data } = await client.from('lawyer_profiles').select('display_name').eq('user_id', lawyerId).maybeSingle()
  return data?.display_name ?? null
}
