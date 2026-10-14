import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/types/database.types'
import type { Localized } from '#shared/domain/localized'
import type { SectionKey } from '#shared/domain/serviceSections'
import { formFieldsSchema, type FormField } from '#shared/domain/formSchema'

type Client = SupabaseClient<Database>
type ServiceKind = Database['public']['Enums']['service_kind']
type PricingType = Database['public']['Enums']['pricing_type']

export interface Category {
  id: string
  slug: string
  title: Localized
  description: Localized
  icon: string
}

export interface ServiceSummary {
  id: string
  slug: string
  kind: ServiceKind
  title: Localized
  shortDescription: Localized
  deliveryEstimate: Localized
  pricingType: PricingType
  basePriceMinor: number
  isFeatured: boolean
  primaryCategoryId: string
  categoryIds: string[]
  rating: { avg: number, count: number } | null
}

export interface ServiceAddon {
  id: string
  title: Localized
  priceMinor: number
}

export interface ServiceSection {
  key: SectionKey
  content: unknown
}

export interface PublicReview {
  id: string
  serviceId: string
  displayName: string
  rating: number
  comment: string | null
  reply: string | null
  createdAt: string
}

export interface ServiceDetail extends ServiceSummary {
  meetingDurationMinutes: number | null
  addons: ServiceAddon[]
  sections: ServiceSection[]
}

export interface FaqEntry {
  id: string
  groupKey: string
  groupTitle: Localized
  question: Localized
  answer: Localized
  showOnHome: boolean
}

const SERVICE_COLUMNS = 'id, slug, kind, title, short_description, delivery_estimate, pricing_type, base_price_minor, is_featured, sort_order, primary_category_id, meeting_duration_minutes, service_category_links(category_id)'

type ServiceRow = Database['public']['Tables']['services']['Row'] & {
  service_category_links: { category_id: string }[]
}

async function ratingsMap(client: Client): Promise<Map<string, { avg: number, count: number }>> {
  const { data } = await client.rpc('service_ratings')
  return new Map((data ?? []).map(r => [r.service_id, { avg: Number(r.avg_rating), count: Number(r.review_count) }]))
}

function toSummary(row: ServiceRow, ratings: Map<string, { avg: number, count: number }>): ServiceSummary {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    title: row.title as unknown as Localized,
    shortDescription: row.short_description as unknown as Localized,
    deliveryEstimate: row.delivery_estimate as unknown as Localized,
    pricingType: row.pricing_type,
    basePriceMinor: row.base_price_minor,
    isFeatured: row.is_featured,
    primaryCategoryId: row.primary_category_id,
    categoryIds: [...new Set([row.primary_category_id, ...row.service_category_links.map(l => l.category_id)])],
    rating: ratings.get(row.id) ?? null,
  }
}

export async function fetchCategories(client: Client): Promise<Category[]> {
  const { data, error } = await client
    .from('service_categories')
    .select('id, slug, title, description, icon')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return (data ?? []).map(c => ({
    id: c.id,
    slug: c.slug,
    title: c.title as unknown as Localized,
    description: c.description as unknown as Localized,
    icon: c.icon,
  }))
}

export async function fetchPublishedServices(client: Client): Promise<ServiceSummary[]> {
  const [{ data, error }, ratings] = await Promise.all([
    client.from('services').select(SERVICE_COLUMNS).eq('status', 'published').order('sort_order'),
    ratingsMap(client),
  ])
  if (error) throw error
  return ((data ?? []) as unknown as ServiceRow[]).map(r => toSummary(r, ratings))
}

export async function fetchServiceBySlug(client: Client, slug: string): Promise<ServiceDetail | null> {
  const { data, error } = await client
    .from('services')
    .select(`${SERVICE_COLUMNS}, service_addons(id, title, price_minor, is_active, sort_order), service_sections(key, is_enabled, sort_order, content)`)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as unknown as ServiceRow & {
    service_addons: { id: string, title: unknown, price_minor: number, is_active: boolean, sort_order: number }[]
    service_sections: { key: SectionKey, is_enabled: boolean, sort_order: number, content: unknown }[]
  }
  const ratings = await ratingsMap(client)
  return {
    ...toSummary(row, ratings),
    meetingDurationMinutes: row.meeting_duration_minutes,
    addons: row.service_addons
      .filter(a => a.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(a => ({ id: a.id, title: a.title as Localized, priceMinor: a.price_minor })),
    sections: row.service_sections
      .filter(s => s.is_enabled)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(s => ({ key: s.key, content: s.content })),
  }
}

export async function fetchPublishedForm(client: Client, serviceId: string): Promise<{ id: string, version: number, fields: FormField[] } | null> {
  const { data: svc, error: svcError } = await client
    .from('services')
    .select('published_form_version_id')
    .eq('id', serviceId)
    .maybeSingle()
  if (svcError) throw svcError
  if (!svc?.published_form_version_id) return null
  const { data, error } = await client
    .from('service_form_versions')
    .select('id, version, fields')
    .eq('id', svc.published_form_version_id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const parsed = formFieldsSchema.safeParse(data.fields)
  if (!parsed.success) throw new Error('Invalid form schema')
  return { id: data.id, version: data.version, fields: parsed.data }
}

export async function fetchPublicReviews(client: Client, opts: { serviceId?: string, minRating?: number, limit?: number } = {}): Promise<PublicReview[]> {
  let q = client
    .from('reviews')
    .select('id, service_id, display_name, rating, comment, reply, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 20)
  if (opts.serviceId) q = q.eq('service_id', opts.serviceId)
  if (opts.minRating) q = q.gte('rating', opts.minRating)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id,
    serviceId: r.service_id,
    displayName: r.display_name,
    rating: r.rating,
    comment: r.comment,
    reply: r.reply,
    createdAt: r.created_at,
  }))
}

export async function fetchFaq(client: Client): Promise<FaqEntry[]> {
  const { data, error } = await client
    .from('faq_entries')
    .select('id, group_key, group_title, question, answer, show_on_home, sort_order')
    .eq('is_published', true)
    .order('sort_order')
  if (error) throw error
  return (data ?? []).map(f => ({
    id: f.id,
    groupKey: f.group_key,
    groupTitle: f.group_title as unknown as Localized,
    question: f.question as unknown as Localized,
    answer: f.answer as unknown as Localized,
    showOnHome: f.show_on_home,
  }))
}

export async function fetchPublicSetting<T>(client: Client, key: string): Promise<T | null> {
  const { data } = await client.from('platform_settings').select('value').eq('key', key).maybeSingle()
  return (data?.value as T) ?? null
}
