import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/types/database.types'
import type { Localized } from '#shared/domain/localized'
import { SECTION_KEYS, type SectionKey } from '#shared/domain/serviceSections'
import { formFieldsSchema, type FormField } from '#shared/domain/formSchema'

/** Admin/staff reads. Every query runs with the user's session; RLS limits rows. */
type Client = SupabaseClient<Database>
type Enums = Database['public']['Enums']

export interface AdminServiceRow {
  id: string
  slug: string
  kind: Enums['service_kind']
  title: Localized
  primaryCategoryId: string
  status: Enums['publish_status']
  pricingType: Enums['pricing_type']
  basePriceMinor: number
  enabledSections: number
  publishedFormVersion: number | null
  publishedFieldCount: number
  hasDraftForm: boolean
  activeAddons: number
  sortOrder: number
}

export async function fetchAdminServices(client: Client): Promise<AdminServiceRow[]> {
  const { data, error } = await client
    .from('services')
    .select(`id, slug, kind, title, primary_category_id, status, pricing_type, base_price_minor, sort_order, published_form_version_id,
      service_sections(is_enabled), service_addons(is_active), service_form_versions!service_form_versions_service_id_fkey(id, version, status, fields)`)
    .order('sort_order')
  if (error) throw error
  return (data ?? []).map((s) => {
    const versions = (s.service_form_versions ?? []) as { id: string, version: number, status: string, fields: unknown }[]
    const published = versions.find(v => v.id === s.published_form_version_id)
    return {
      id: s.id,
      slug: s.slug,
      kind: s.kind,
      title: s.title as unknown as Localized,
      primaryCategoryId: s.primary_category_id,
      status: s.status,
      pricingType: s.pricing_type,
      basePriceMinor: s.base_price_minor,
      enabledSections: (s.service_sections ?? []).filter(x => x.is_enabled).length,
      publishedFormVersion: published?.version ?? null,
      publishedFieldCount: Array.isArray(published?.fields)
        ? (published.fields as { type: string }[]).filter(f => f.type !== 'section' && f.type !== 'help').length
        : 0,
      hasDraftForm: versions.some(v => v.status === 'draft'),
      activeAddons: (s.service_addons ?? []).filter(a => a.is_active).length,
      sortOrder: s.sort_order,
    }
  })
}

export interface EditorAddon {
  id: string | null
  title: Localized
  priceMinor: number
  isActive: boolean
}

export interface EditorSection {
  key: SectionKey
  isEnabled: boolean
  content: unknown
}

export interface ServiceEditorData {
  id: string
  slug: string
  kind: Enums['service_kind']
  status: Enums['publish_status']
  primaryCategoryId: string
  categoryIds: string[]
  title: Localized
  shortDescription: Localized
  deliveryEstimate: Localized
  pricingType: Enums['pricing_type']
  basePriceMinor: number
  meetingDurationMinutes: number | null
  isFeatured: boolean
  sortOrder: number
  addons: EditorAddon[]
  sections: EditorSection[]
  publishedForm: { id: string, version: number, fields: FormField[] } | null
  draftForm: { id: string, version: number, fields: FormField[] } | null
}

function parseFields(raw: unknown): FormField[] {
  const parsed = formFieldsSchema.safeParse(raw)
  return parsed.success ? parsed.data : (Array.isArray(raw) ? raw as FormField[] : [])
}

/** All sections in editor order: stored ones first (by sort order), then missing keys disabled. */
export function completeSections(stored: EditorSection[]): EditorSection[] {
  const keys = new Set(stored.map(s => s.key))
  return [...stored, ...SECTION_KEYS.filter(k => !keys.has(k)).map(k => ({ key: k, isEnabled: false, content: null }))]
}

export async function fetchServiceForEditor(client: Client, id: string): Promise<ServiceEditorData | null> {
  const { data, error } = await client
    .from('services')
    .select(`id, slug, kind, status, primary_category_id, title, short_description, delivery_estimate, pricing_type, base_price_minor,
      meeting_duration_minutes, is_featured, sort_order, published_form_version_id,
      service_category_links(category_id),
      service_addons(id, title, price_minor, is_active, sort_order),
      service_sections(key, is_enabled, sort_order, content),
      service_form_versions!service_form_versions_service_id_fkey(id, version, status, fields)`)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const versions = (data.service_form_versions ?? []) as { id: string, version: number, status: string, fields: unknown }[]
  const pub = versions.find(v => v.id === data.published_form_version_id)
  const draft = versions.find(v => v.status === 'draft')
  return {
    id: data.id,
    slug: data.slug,
    kind: data.kind,
    status: data.status,
    primaryCategoryId: data.primary_category_id,
    categoryIds: (data.service_category_links ?? []).map(l => l.category_id).filter(c => c !== data.primary_category_id),
    title: data.title as unknown as Localized,
    shortDescription: data.short_description as unknown as Localized,
    deliveryEstimate: data.delivery_estimate as unknown as Localized,
    pricingType: data.pricing_type,
    basePriceMinor: data.base_price_minor,
    meetingDurationMinutes: data.meeting_duration_minutes,
    isFeatured: data.is_featured,
    sortOrder: data.sort_order,
    addons: [...(data.service_addons ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(a => ({ id: a.id, title: a.title as unknown as Localized, priceMinor: a.price_minor, isActive: a.is_active })),
    sections: completeSections(
      [...(data.service_sections ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(s => ({ key: s.key, isEnabled: s.is_enabled, content: s.content })),
    ),
    publishedForm: pub ? { id: pub.id, version: pub.version, fields: parseFields(pub.fields) } : null,
    draftForm: draft ? { id: draft.id, version: draft.version, fields: parseFields(draft.fields) } : null,
  }
}

export interface AdminCategory { id: string, slug: string, title: Localized }

export async function fetchAllCategories(client: Client): Promise<AdminCategory[]> {
  const { data, error } = await client.from('service_categories').select('id, slug, title').order('sort_order')
  if (error) throw error
  return (data ?? []).map(c => ({ id: c.id, slug: c.slug, title: c.title as unknown as Localized }))
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
export interface AdminPaymentRow {
  id: string
  status: Enums['payment_attempt_status']
  method: Enums['payment_method']
  provider: string
  amountMinor: number
  receiptNumber: string | null
  providerReference: string | null
  isDemo: boolean
  createdAt: string
  orderNumber: string | null
  customerName: string | null
}

export async function fetchAdminPayments(client: Client): Promise<AdminPaymentRow[]> {
  const { data, error } = await client
    .from('payments')
    .select('id, status, method, provider, is_demo, amount_minor, receipt_number, provider_reference, created_at, orders(order_number, customer_accounts(display_name))')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return (data ?? []).map((p) => {
    const order = p.orders as unknown as { order_number: string, customer_accounts: { display_name: string } | null } | null
    return {
      id: p.id,
      status: p.status,
      method: p.method,
      provider: p.provider,
      amountMinor: p.amount_minor,
      receiptNumber: p.receipt_number,
      providerReference: p.provider_reference,
      isDemo: p.is_demo,
      createdAt: p.created_at,
      orderNumber: order?.order_number ?? null,
      customerName: order?.customer_accounts?.display_name ?? null,
    }
  })
}

export interface AdminRefundRow { id: string, amountMinor: number, status: Enums['refund_status'], createdAt: string }

export async function fetchRefunds(client: Client): Promise<AdminRefundRow[]> {
  const { data, error } = await client.from('refunds').select('id, amount_minor, status, created_at').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => ({ id: r.id, amountMinor: r.amount_minor, status: r.status, createdAt: r.created_at }))
}

export async function sumAwaitingPayment(client: Client): Promise<number> {
  const { data, error } = await client.from('orders').select('total_minor').eq('status', 'awaiting_payment')
  if (error) throw error
  return (data ?? []).reduce((n, o) => n + o.total_minor, 0)
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export interface StaffReviewRow {
  id: string
  displayName: string
  rating: number
  comment: string | null
  reply: string | null
  createdAt: string
  serviceTitle: Localized | null
  orderNumber: string | null
  assignedLawyerId: string | null
}

export async function fetchStaffReviews(client: Client): Promise<StaffReviewRow[]> {
  const { data, error } = await client
    .from('reviews')
    .select('id, display_name, rating, comment, reply, created_at, services(title), orders(order_number, assigned_lawyer_id)')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return (data ?? []).map((r) => {
    const order = r.orders as unknown as { order_number: string, assigned_lawyer_id: string | null } | null
    return {
      id: r.id,
      displayName: r.display_name,
      rating: r.rating,
      comment: r.comment,
      reply: r.reply,
      createdAt: r.created_at,
      serviceTitle: ((r.services as unknown as { title: Localized } | null)?.title) ?? null,
      orderNumber: order?.order_number ?? null,
      assignedLawyerId: order?.assigned_lawyer_id ?? null,
    }
  })
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function fetchSettings(client: Client): Promise<Record<string, unknown>> {
  const { data, error } = await client.from('platform_settings').select('key, value')
  if (error) throw error
  return Object.fromEntries((data ?? []).map(s => [s.key, s.value]))
}

export interface AvailabilityRule { weekday: number, startTime: string, endTime: string }
export interface AvailabilityException { id: string, date: string, startTime: string | null, endTime: string | null, reason: string | null }

export async function fetchAvailability(client: Client): Promise<{ rules: AvailabilityRule[], exceptions: AvailabilityException[] }> {
  const [rules, exceptions] = await Promise.all([
    client.from('availability_rules').select('weekday, start_time, end_time').is('lawyer_id', null).eq('is_active', true).order('weekday'),
    client.from('availability_exceptions').select('id, exception_date, start_time, end_time, reason').is('lawyer_id', null).order('exception_date'),
  ])
  if (rules.error) throw rules.error
  if (exceptions.error) throw exceptions.error
  const hm = (t: string | null) => (t ? t.slice(0, 5) : null)
  return {
    rules: (rules.data ?? []).map(r => ({ weekday: r.weekday, startTime: hm(r.start_time)!, endTime: hm(r.end_time)! })),
    exceptions: (exceptions.data ?? []).map(e => ({ id: e.id, date: e.exception_date, startTime: hm(e.start_time), endTime: hm(e.end_time), reason: e.reason })),
  }
}

export interface LawyerOption { id: string, displayName: string, isActive: boolean }

export async function fetchLawyers(client: Client): Promise<LawyerOption[]> {
  const { data, error } = await client.from('lawyer_profiles').select('user_id, display_name, is_active').order('display_name')
  if (error) throw error
  return (data ?? []).map(l => ({ id: l.user_id, displayName: l.display_name, isActive: l.is_active }))
}
