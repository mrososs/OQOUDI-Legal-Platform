import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/types/database.types'
import type { Localized } from '#shared/domain/localized'
import type { OrderStatus, PaymentStatus } from '#shared/domain/orderStatus'
import { formFieldsSchema, type FormField } from '#shared/domain/formSchema'

type Client = SupabaseClient<Database>
type Tables = Database['public']['Tables']

export interface ServiceSnapshot {
  slug: string
  kind: 'standard' | 'written_consultation' | 'video_consultation'
  title: Localized
  pricingType: 'fixed' | 'quote'
  basePriceMinor: number
  deliveryEstimate: Localized
  meetingDurationMinutes: number | null
}

export interface OrderListItem {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  totalMinor: number
  createdAt: string
  service: ServiceSnapshot
  customerAccountId: string
  assignedLawyerId: string | null
  booking: { startsAt: string, endsAt: string, status: string, meetingUrl: string | null } | null
}

export interface OrderDocument {
  id: string
  kind: Tables['documents']['Row']['kind']
  originalName: string
  sizeBytes: number
  createdAt: string
  formFieldId: string | null
  deliveryId: string | null
  responseId: string | null
  messageId: string | null
  status: string
}

export interface OrderDetail extends OrderListItem {
  formVersionId: string
  formAnswers: Record<string, unknown>
  formFields: FormField[]
  baseMinor: number
  addonsTotalMinor: number
  quoteIssuedAt: string | null
  paidAt: string | null
  cancelReason: string | null
  addons: { id: string, title: Localized, priceMinor: number }[]
  documents: OrderDocument[]
  deliveries: { id: string, version: number, note: string | null, deliveredAt: string }[]
  responses: { id: string, version: number, body: string, publishedAt: string }[]
  messages: { id: string, senderKind: string, senderId: string | null, body: string, createdAt: string }[]
  events: { id: string, type: string, fromStatus: OrderStatus | null, toStatus: OrderStatus | null, actorKind: string, visibility: string, details: Record<string, unknown>, createdAt: string }[]
  payments: { id: string, status: string, method: string, amountMinor: number, receiptNumber: string | null, failureReason: string | null, createdAt: string, succeededAt: string | null }[]
  review: { id: string, rating: number, comment: string | null, reply: string | null, createdAt: string } | null
}

const LIST_COLUMNS = 'id, order_number, status, payment_status, total_minor, created_at, service_snapshot, customer_account_id, assigned_lawyer_id, consultation_bookings(starts_at, ends_at, status, meeting_url)'

type ListRow = Pick<Tables['orders']['Row'], 'id' | 'order_number' | 'status' | 'payment_status' | 'total_minor' | 'created_at' | 'service_snapshot' | 'customer_account_id' | 'assigned_lawyer_id'> & {
  consultation_bookings: { starts_at: string, ends_at: string, status: string, meeting_url: string | null } | { starts_at: string, ends_at: string, status: string, meeting_url: string | null }[] | null
}

function toListItem(r: ListRow): OrderListItem {
  const b = Array.isArray(r.consultation_bookings) ? r.consultation_bookings[0] : r.consultation_bookings
  return {
    id: r.id,
    orderNumber: r.order_number,
    status: r.status,
    paymentStatus: r.payment_status,
    totalMinor: r.total_minor,
    createdAt: r.created_at,
    service: r.service_snapshot as unknown as ServiceSnapshot,
    customerAccountId: r.customer_account_id,
    assignedLawyerId: r.assigned_lawyer_id,
    booking: b ? { startsAt: b.starts_at, endsAt: b.ends_at, status: b.status, meetingUrl: b.meeting_url } : null,
  }
}

/** Orders visible to the caller (RLS decides which). */
export async function fetchOrders(client: Client, opts: { statuses?: OrderStatus[], accountId?: string, limit?: number } = {}): Promise<OrderListItem[]> {
  let q = client.from('orders').select(LIST_COLUMNS).order('created_at', { ascending: false }).limit(opts.limit ?? 200)
  if (opts.statuses?.length) q = q.in('status', opts.statuses)
  if (opts.accountId) q = q.eq('customer_account_id', opts.accountId)
  const { data, error } = await q
  if (error) throw error
  return ((data ?? []) as unknown as ListRow[]).map(toListItem)
}

/**
 * Full order detail. Returns null when the order does not exist OR the
 * caller may not see it — both look identical (no existence leak).
 */
export async function fetchOrderDetail(client: Client, orderNumber: string): Promise<OrderDetail | null> {
  const { data, error } = await client
    .from('orders')
    .select(`${LIST_COLUMNS}, form_version_id, form_answers, base_price_minor, addons_total_minor, quote_issued_at, paid_at, cancel_reason,
      order_addons(id, title, price_minor),
      order_deliveries(id, version, note, delivered_at),
      consultation_responses(id, version, body, published_at),
      order_messages(id, sender_kind, sender_id, body, created_at),
      order_events(id, type, from_status, to_status, actor_kind, visibility, details, created_at),
      reviews(id, rating, comment, reply, created_at)`)
    .eq('order_number', orderNumber)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as unknown as ListRow & {
    form_version_id: string
    form_answers: Record<string, unknown>
    base_price_minor: number
    addons_total_minor: number
    quote_issued_at: string | null
    paid_at: string | null
    cancel_reason: string | null
    order_addons: { id: string, title: Localized, price_minor: number }[]
    order_deliveries: { id: string, version: number, note: string | null, delivered_at: string }[]
    consultation_responses: { id: string, version: number, body: string, published_at: string }[]
    order_messages: { id: string, sender_kind: string, sender_id: string | null, body: string, created_at: string }[]
    order_events: { id: string, type: string, from_status: OrderStatus | null, to_status: OrderStatus | null, actor_kind: string, visibility: string, details: Record<string, unknown>, created_at: string }[]
    reviews: { id: string, rating: number, comment: string | null, reply: string | null, created_at: string } | { id: string, rating: number, comment: string | null, reply: string | null, created_at: string }[] | null
  }

  const [docsRes, paymentsRes, versionRes] = await Promise.all([
    client
      .from('documents')
      .select('id, kind, original_name, size_bytes, created_at, form_field_id, delivery_id, response_id, message_id, status')
      .eq('order_id', row.id)
      .eq('status', 'ready')
      .order('created_at'),
    client
      .from('payments')
      .select('id, status, method, amount_minor, receipt_number, failure_reason, created_at, succeeded_at')
      .eq('order_id', row.id)
      .order('created_at', { ascending: false }),
    client.from('service_form_versions').select('fields').eq('id', row.form_version_id).maybeSingle(),
  ])
  if (docsRes.error) throw docsRes.error

  const review = Array.isArray(row.reviews) ? row.reviews[0] : row.reviews
  const parsedFields = formFieldsSchema.safeParse(versionRes.data?.fields ?? [])

  return {
    ...toListItem(row),
    formVersionId: row.form_version_id,
    formAnswers: row.form_answers ?? {},
    formFields: parsedFields.success ? parsedFields.data : [],
    baseMinor: row.base_price_minor,
    addonsTotalMinor: row.addons_total_minor,
    quoteIssuedAt: row.quote_issued_at,
    paidAt: row.paid_at,
    cancelReason: row.cancel_reason,
    addons: row.order_addons.map(a => ({ id: a.id, title: a.title, priceMinor: a.price_minor })),
    documents: (docsRes.data ?? []).map(d => ({
      id: d.id,
      kind: d.kind,
      originalName: d.original_name,
      sizeBytes: d.size_bytes,
      createdAt: d.created_at,
      formFieldId: d.form_field_id,
      deliveryId: d.delivery_id,
      responseId: d.response_id,
      messageId: d.message_id,
      status: d.status,
    })),
    deliveries: [...row.order_deliveries].sort((a, b) => b.version - a.version).map(d => ({ id: d.id, version: d.version, note: d.note, deliveredAt: d.delivered_at })),
    responses: [...row.consultation_responses].sort((a, b) => b.version - a.version).map(r => ({ id: r.id, version: r.version, body: r.body, publishedAt: r.published_at })),
    messages: [...row.order_messages].sort((a, b) => a.created_at.localeCompare(b.created_at)).map(m => ({ id: m.id, senderKind: m.sender_kind, senderId: m.sender_id, body: m.body, createdAt: m.created_at })),
    events: [...row.order_events].sort((a, b) => a.created_at.localeCompare(b.created_at)).map(e => ({
      id: e.id, type: e.type, fromStatus: e.from_status, toStatus: e.to_status, actorKind: e.actor_kind, visibility: e.visibility, details: e.details ?? {}, createdAt: e.created_at,
    })),
    payments: (paymentsRes.data ?? []).map(p => ({
      id: p.id, status: p.status, method: p.method, amountMinor: p.amount_minor, receiptNumber: p.receipt_number, failureReason: p.failure_reason, createdAt: p.created_at, succeededAt: p.succeeded_at,
    })),
    review: review ? { id: review.id, rating: review.rating, comment: review.comment, reply: review.reply, createdAt: review.created_at } : null,
  }
}
