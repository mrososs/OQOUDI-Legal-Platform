import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/types/database.types'
import type { OrderStatus } from '#shared/domain/orderStatus'

type Client = SupabaseClient<Database>

/** Display names of customer accounts (RLS: admins all, lawyers only accounts they handle). */
export async function fetchAccountNames(client: Client, accountIds: string[]): Promise<Record<string, string>> {
  const ids = [...new Set(accountIds)].filter(Boolean)
  if (!ids.length) return {}
  const { data, error } = await client.from('customer_accounts').select('id, display_name').in('id', ids)
  if (error) throw error
  return Object.fromEntries((data ?? []).map(a => [a.id, a.display_name]))
}

export interface StaffExtras {
  customer: {
    accountName: string
    accountKind: 'individual' | 'company'
    fullName: string | null
    email: string | null
    phone: string | null
    ordersCount: number
  }
  formVersion: number | null
  notes: { id: string, body: string, createdAt: string }[]
}

/** Staff-only context for an order detail page (notes, customer contact, form version number). */
export async function fetchStaffExtras(client: Client, orderId: string, accountId: string, formVersionId: string): Promise<StaffExtras> {
  const [orderRes, accountRes, notesRes, versionRes, countRes] = await Promise.all([
    client.from('orders').select('created_by').eq('id', orderId).maybeSingle(),
    client.from('customer_accounts').select('display_name, kind').eq('id', accountId).maybeSingle(),
    client.from('order_notes').select('id, body, created_at').eq('order_id', orderId).order('created_at'),
    client.from('service_form_versions').select('version').eq('id', formVersionId).maybeSingle(),
    client.from('orders').select('id', { count: 'exact', head: true }).eq('customer_account_id', accountId),
  ])
  const createdBy = orderRes.data?.created_by
  const profileRes = createdBy
    ? await client.from('profiles').select('full_name, email, phone').eq('id', createdBy).maybeSingle()
    : { data: null }
  return {
    customer: {
      accountName: accountRes.data?.display_name ?? '',
      accountKind: (accountRes.data?.kind ?? 'individual') as 'individual' | 'company',
      fullName: profileRes.data?.full_name ?? null,
      email: profileRes.data?.email ?? null,
      phone: profileRes.data?.phone ?? null,
      ordersCount: countRes.count ?? 0,
    },
    formVersion: versionRes.data?.version ?? null,
    notes: (notesRes.data ?? []).map(n => ({ id: n.id, body: n.body, createdAt: n.created_at })),
  }
}

export interface LawyerOption {
  id: string
  name: string
}

export async function fetchActiveLawyers(client: Client): Promise<LawyerOption[]> {
  const { data, error } = await client.from('lawyer_profiles').select('user_id, display_name').eq('is_active', true).order('display_name')
  if (error) throw error
  return (data ?? []).map(l => ({ id: l.user_id, name: l.display_name }))
}

export interface CalendarBooking {
  id: string
  orderId: string
  orderNumber: string
  orderStatus: OrderStatus
  customerAccountId: string
  startsAt: string
  endsAt: string
  status: string
  meetingUrl: string | null
}

/** Bookings overlapping [fromIso, toIso). RLS limits lawyers to their assigned orders. */
export async function fetchBookings(client: Client, fromIso: string, toIso: string): Promise<CalendarBooking[]> {
  const { data, error } = await client
    .from('consultation_bookings')
    .select('id, order_id, starts_at, ends_at, status, meeting_url, orders(order_number, status, customer_account_id)')
    .in('status', ['held', 'confirmed', 'completed'])
    .gte('starts_at', fromIso)
    .lt('starts_at', toIso)
    .order('starts_at')
  if (error) throw error
  return (data ?? []).map((b) => {
    const o = (Array.isArray(b.orders) ? b.orders[0] : b.orders) as { order_number: string, status: OrderStatus, customer_account_id: string } | null
    return {
      id: b.id,
      orderId: b.order_id,
      orderNumber: o?.order_number ?? '',
      orderStatus: o?.status ?? 'under_review',
      customerAccountId: o?.customer_account_id ?? '',
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      status: b.status,
      meetingUrl: b.meeting_url,
    }
  })
}

export interface AvailabilityData {
  rules: { weekday: number, startTime: string, endTime: string }[]
  exceptions: { id: string, date: string, startTime: string | null, endTime: string | null, reason: string | null }[]
}

export async function fetchAvailability(client: Client, fromDate: string, toDate: string): Promise<AvailabilityData> {
  const [rules, exceptions] = await Promise.all([
    client.from('availability_rules').select('weekday, start_time, end_time').is('lawyer_id', null).eq('is_active', true),
    client.from('availability_exceptions').select('id, exception_date, start_time, end_time, reason').is('lawyer_id', null)
      .gte('exception_date', fromDate).lte('exception_date', toDate),
  ])
  if (rules.error) throw rules.error
  if (exceptions.error) throw exceptions.error
  return {
    rules: (rules.data ?? []).map(r => ({ weekday: r.weekday, startTime: r.start_time.slice(0, 5), endTime: r.end_time.slice(0, 5) })),
    exceptions: (exceptions.data ?? []).map(e => ({
      id: e.id,
      date: e.exception_date,
      startTime: e.start_time?.slice(0, 5) ?? null,
      endTime: e.end_time?.slice(0, 5) ?? null,
      reason: e.reason,
    })),
  }
}
