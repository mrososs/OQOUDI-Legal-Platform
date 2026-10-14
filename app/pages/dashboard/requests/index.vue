<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { ORDER_STATUSES, PAYMENT_STATUSES, type OrderStatus } from '#shared/domain/orderStatus'
import { fetchOrders } from '~/repositories/orders'
import { fetchAccountNames } from '~/repositories/dashboard'

definePageMeta({ layout: 'lawyer', middleware: ['auth', 'staff'] })

const { t } = useI18n()
const f = useFormat()
const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient<Database>()

const { data, status: loadStatus } = await useAsyncData('dashboard:requests', async () => {
  const orders = await fetchOrders(supabase, { limit: 500 })
  const names = await fetchAccountNames(supabase, orders.map(o => o.customerAccountId))
  return { orders, names }
})

function queryValue(key: string, allowed: readonly string[] | null, fallback: string) {
  const v = route.query[key]
  if (typeof v !== 'string') return fallback
  return !allowed || allowed.includes(v) ? v : fallback
}
function setQuery(key: string, value: string, fallback: string) {
  router.replace({ query: { ...route.query, [key]: value === fallback || !value ? undefined : value } })
}

const q = computed({ get: () => queryValue('q', null, ''), set: v => setQuery('q', v, '') })
const statusFilter = computed({ get: () => queryValue('status', ORDER_STATUSES, 'all'), set: v => setQuery('status', v, 'all') })
const payFilter = computed({ get: () => queryValue('pay', PAYMENT_STATUSES, 'all'), set: v => setQuery('pay', v, 'all') })

const searched = computed(() => {
  const all = data.value?.orders ?? []
  const names = data.value?.names ?? {}
  const needle = q.value.trim().toLowerCase()
  return all.filter((o) => {
    if (payFilter.value !== 'all' && o.paymentStatus !== payFilter.value) return false
    if (!needle) return true
    return [o.orderNumber, names[o.customerAccountId] ?? '', o.service.title.ar, o.service.title.en ?? '']
      .some(x => x.toLowerCase().includes(needle))
  })
})
const counts = computed(() => {
  const out: Partial<Record<OrderStatus | 'all', number>> = { all: searched.value.length }
  for (const o of searched.value) out[o.status] = (out[o.status] ?? 0) + 1
  return out
})
const rows = computed(() => statusFilter.value === 'all' ? searched.value : searched.value.filter(o => o.status === statusFilter.value))

useSeoMeta({ title: () => t('dash.nav.requests'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <h1 class="title">{{ t('dash.nav.requests') }}</h1>
    <DashboardRequestFilters v-model:q="q" v-model:status="statusFilter" v-model:pay="payFilter" :counts="counts" />
    <UiAlert v-if="loadStatus === 'error'">{{ t('errors.generic') }}</UiAlert>
    <div class="kh-card kh-card--flush">
      <DashboardOrdersTable :orders="rows" :names="data?.names ?? {}" :empty-text="t('dashOps.noMatches')" />
      <div class="foot">{{ t('dashOps.count', { n: f.number(rows.length) }) }}</div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.title { font-size: 26px; font-weight: 800; margin: 0; }
.foot { padding: 12px 16px; border-top: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 13px; }
</style>
