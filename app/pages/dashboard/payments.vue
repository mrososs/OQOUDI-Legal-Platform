<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { fetchAdminPayments, fetchRefunds, sumAwaitingPayment } from '~/repositories/admin'

definePageMeta({ layout: 'lawyer', middleware: ['auth', 'admin'] })

const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const route = useRoute()
const router = useRouter()

const { data } = await useAsyncData('admin:payments', async () => {
  const [payments, refunds, awaiting] = await Promise.all([fetchAdminPayments(supabase), fetchRefunds(supabase), sumAwaitingPayment(supabase)])
  return { payments, refunds, awaiting }
}, { default: () => ({ payments: [], refunds: [], awaiting: 0 }) })

const FILTERS = ['all', 'succeeded', 'failed', 'pending', 'cancelled'] as const
const filter = computed(() => ((FILTERS as readonly string[]).includes(String(route.query.status)) ? String(route.query.status) : 'all'))
const rows = computed(() => data.value.payments.filter(p =>
  filter.value === 'all' || p.status === filter.value || (filter.value === 'pending' && p.status === 'initiated')
  || (filter.value === 'cancelled' && p.status === 'expired'),
))

const kpis = computed(() => {
  const p = data.value.payments
  const collected = p.filter(x => x.status === 'succeeded').reduce((n, x) => n + x.amountMinor, 0)
  const refunded = data.value.refunds.filter(r => r.status === 'succeeded').reduce((n, r) => n + r.amountMinor, 0)
  const requested = data.value.refunds.filter(r => r.status === 'requested')
  return [
    { label: t('admin.payments.kpi.collected'), value: f.money(collected) },
    { label: t('admin.payments.kpi.awaiting'), value: f.money(data.value.awaiting) },
    { label: t('admin.payments.kpi.refunded'), value: f.money(refunded) },
    { label: t('admin.payments.kpi.refundRequests'), value: requested.length ? `${f.number(requested.length)} · ${f.money(requested.reduce((n, r) => n + r.amountMinor, 0))}` : f.number(0) },
    { label: t('admin.payments.kpi.failed'), value: f.number(p.filter(x => x.status === 'failed').length) },
  ]
})

const TONE: Record<string, 'positive' | 'critical' | 'caution' | 'neutral'> = {
  succeeded: 'positive', failed: 'critical', pending: 'caution', initiated: 'caution', cancelled: 'neutral', expired: 'neutral',
}

useSeoMeta({ title: () => t('dash.nav.payments'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <h1 class="title">{{ t('dash.nav.payments') }}</h1>
    <div class="kpis">
      <div v-for="k in kpis" :key="k.label" class="kh-card kpi">
        <div class="kpi-label">{{ k.label }}</div>
        <div class="kpi-value">{{ k.value }}</div>
      </div>
    </div>
    <div class="chips" role="group" :aria-label="t('admin.payments.filter')">
      <button
        v-for="id in FILTERS"
        :key="id"
        type="button"
        class="chip"
        :aria-pressed="filter === id"
        @click="router.replace({ query: id === 'all' ? {} : { status: id } })"
      >
        {{ t(`admin.payments.status.${id}`) }}
      </button>
    </div>
    <div class="kh-card table-card">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.payments.cols.receipt') }}</th>
            <th>{{ t('admin.payments.cols.order') }}</th>
            <th>{{ t('admin.payments.cols.customer') }}</th>
            <th>{{ t('admin.payments.cols.method') }}</th>
            <th>{{ t('admin.payments.cols.date') }}</th>
            <th>{{ t('admin.payments.cols.amount') }}</th>
            <th>{{ t('admin.payments.cols.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in rows" :key="p.id">
            <td class="ltr">{{ p.receiptNumber ?? p.providerReference ?? '—' }}</td>
            <td>
              <NuxtLinkLocale v-if="p.orderNumber" :to="`/dashboard/requests/${p.orderNumber}`" class="ltr">{{ p.orderNumber }}</NuxtLinkLocale>
            </td>
            <td>{{ p.customerName ?? '—' }}</td>
            <td>{{ t(`checkout.methods.${p.method}.label`) }}<span v-if="p.provider === 'simulator'" class="sim"> · {{ t('admin.payments.simulator') }}</span></td>
            <td>{{ f.dateTime(p.createdAt) }}</td>
            <td class="amount">{{ f.money(p.amountMinor) }}</td>
            <td><UiBadge :tone="TONE[p.status] ?? 'neutral'">{{ t(`admin.payments.attempt.${p.status}`) }}</UiBadge></td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="7" class="empty">{{ t('admin.payments.empty') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="muted foot">{{ t('admin.payments.footnote') }}</p>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.title { font-size: 26px; font-weight: 800; margin: 0; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.kpi { padding: 16px; }
.kpi-label { font-size: 13px; color: var(--text-muted); }
.kpi-value { font-family: var(--font-heading); font-size: 22px; font-weight: 800; color: var(--text-strong); }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border-default); background: #fff; color: var(--text-body); font-size: 13px; cursor: pointer; }
.chip[aria-pressed='true'] { background: var(--ink-900); color: var(--cream-100); border-color: var(--ink-900); }
.table-card { padding: 0; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 900px; font-size: 14px; }
.table th { background: var(--neutral-100); text-align: start; color: var(--text-muted); font-weight: 600; padding: 10px 16px; }
.table td { padding: 10px 16px; border-top: 1px solid var(--border-subtle); }
.amount { color: var(--text-strong); font-weight: 600; }
.sim { font-size: 11px; color: var(--caution-500); }
.empty { text-align: center; color: var(--text-muted); padding: 32px; }
.foot { font-size: 12px; margin: 0; }
</style>
