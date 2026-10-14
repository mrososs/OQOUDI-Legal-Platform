import type { Database } from '#shared/types/database.types'
import { fetchOrders } from '~/repositories/orders'
import { fetchAccountNames, fetchBookings } from '~/repositories/dashboard'
import type { KpiItem } from '~/components/dashboard/DashboardKpiCards.vue'
import type { AttentionItem } from '~/components/dashboard/DashboardAttentionList.vue'

interface Kpis {
  newOrders: number
  inProgress: number
  awaitingCustomer: number
  completedThisMonth: number
  revenueThisMonthMinor: number | null
}

/** Data + derived view models for the lawyer overview (RLS-scoped). */
export function useDashboardOverview() {
  const supabase = useSupabaseClient<Database>()
  const session = useSessionStore()
  const { t } = useI18n()
  const f = useFormat()

  const { data, status, refresh } = useAsyncData('dashboard:overview', async () => {
    const now = new Date()
    const in7 = new Date(now.getTime() + 7 * 86400000)
    const [kpiRes, orders, bookings] = await Promise.all([
      supabase.rpc('dashboard_kpis'),
      fetchOrders(supabase, { limit: 200 }),
      fetchBookings(supabase, new Date(now.getTime() - 3600000).toISOString(), in7.toISOString()),
    ])
    const names = await fetchAccountNames(supabase, [...orders.map(o => o.customerAccountId), ...bookings.map(b => b.customerAccountId)])
    return { kpis: (kpiRes.data ?? null) as Kpis | null, orders, bookings, names }
  })

  const todayYmd = computed(() => cairoYmd(new Date()))
  const upcoming = computed(() => (data.value?.bookings ?? []).filter(b => b.status === 'confirmed'))
  const missingLinks = computed(() => upcoming.value.filter(b => !b.meetingUrl))
  const todayMeetings = computed(() => upcoming.value.filter(b => cairoYmd(b.startsAt) === todayYmd.value))
  const soon = computed(() => {
    const tomorrow = cairoYmd(new Date(Date.now() + 86400000))
    return upcoming.value.filter(b => cairoYmd(b.startsAt) <= tomorrow)
  })

  const kpiItems = computed<KpiItem[]>(() => {
    const k = data.value?.kpis
    const orders = data.value?.orders ?? []
    const revisions = orders.filter(o => o.status === 'revision').length
    const failed = orders.filter(o => o.paymentStatus === 'failed').length
    const items: KpiItem[] = [
      { key: 'new', label: t('dashOps.kpi.new'), value: f.number(k?.newOrders ?? 0), sub: t('dashOps.kpi.newSub'), to: '/dashboard/requests?status=under_review' },
      { key: 'progress', label: t('dashOps.kpi.progress'), value: f.number(k?.inProgress ?? 0), sub: t('dashOps.kpi.progressSub', { n: f.number(revisions) }), to: '/dashboard/requests?status=in_progress' },
      { key: 'customer', label: t('dashOps.kpi.customer'), value: f.number(k?.awaitingCustomer ?? 0), sub: t('dashOps.kpi.customerSub', { n: f.number(failed) }), to: '/dashboard/requests?status=awaiting_info' },
      { key: 'completed', label: t('dashOps.kpi.completed'), value: f.number(k?.completedThisMonth ?? 0), sub: t('dashOps.kpi.completedSub'), to: '/dashboard/requests?status=completed' },
      { key: 'today', label: t('dashOps.kpi.today'), value: f.number(todayMeetings.value.length), sub: t('booking.cairoTime'), to: '/dashboard/calendar' },
      {
        key: 'links',
        label: t('dashOps.kpi.links'),
        value: f.number(missingLinks.value.length),
        sub: missingLinks.value.length ? t('dashOps.kpi.linksSub') : t('dashOps.kpi.linksDone'),
        to: '/dashboard/calendar',
        warn: missingLinks.value.length > 0,
      },
    ]
    if (session.isAdmin && k?.revenueThisMonthMinor != null) {
      items.push({ key: 'revenue', label: t('dashOps.kpi.revenue'), value: f.money(k.revenueThisMonthMinor), sub: t('dashOps.kpi.revenueSub'), to: '/dashboard/payments' })
    }
    return items
  })

  const attention = computed<AttentionItem[]>(() => {
    const d = data.value
    if (!d) return []
    const name = (id: string) => d.names[id] ?? '—'
    const items: AttentionItem[] = []
    for (const b of missingLinks.value) {
      items.push({ key: `link-${b.id}`, orderNumber: b.orderNumber, text: t('dashOps.att.link', { customer: name(b.customerAccountId), when: `${f.day(b.startsAt)}، ${f.time(b.startsAt)}` }) })
    }
    for (const o of d.orders) {
      const params = { customer: name(o.customerAccountId), service: f.text(o.service.title) }
      if (o.status === 'revision') items.push({ key: `rev-${o.id}`, orderNumber: o.orderNumber, text: t('dashOps.att.revision', params) })
      else if (o.status === 'new') items.push({ key: `new-${o.id}`, orderNumber: o.orderNumber, text: t('dashOps.att.quote', params) })
      else if (o.status === 'under_review') items.push({ key: `rv-${o.id}`, orderNumber: o.orderNumber, text: t('dashOps.att.review', params) })
      else if (o.status === 'in_progress' && o.service.kind === 'written_consultation') items.push({ key: `w-${o.id}`, orderNumber: o.orderNumber, text: t('dashOps.att.written', params) })
    }
    return items.slice(0, 8)
  })

  const recent = computed(() => (data.value?.orders ?? []).slice(0, 6))

  return { data, status, refresh, kpiItems, attention, soon, recent }
}
