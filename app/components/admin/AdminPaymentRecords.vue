<script setup lang="ts">
import type { AdminPaymentRow } from '~/repositories/admin'

/**
 * All payment attempt rows, including historical gateway/simulator attempts
 * kept for audit. Demo rows are flagged and excluded from collected revenue.
 */
const props = defineProps<{ payments: AdminPaymentRow[] }>()
const { t, te } = useI18n()
const f = useFormat()

const TONE: Record<string, 'positive' | 'critical' | 'caution' | 'neutral'> = {
  succeeded: 'positive', failed: 'critical', pending: 'caution', initiated: 'caution', cancelled: 'neutral', expired: 'neutral',
}
const collectedReal = computed(() => props.payments.filter(p => p.status === 'succeeded' && !p.isDemo).reduce((n, p) => n + p.amountMinor, 0))
const collectedDemo = computed(() => props.payments.filter(p => p.status === 'succeeded' && p.isDemo).reduce((n, p) => n + p.amountMinor, 0))

function methodLabel(method: string) {
  return te(`mpay.methods.${method}.label`) ? t(`mpay.methods.${method}.label`) : t(`checkout.methods.${method}.label`)
}
function providerLabel(p: AdminPaymentRow) {
  if (p.provider === 'manual') return t('admin.mpay.records.manual')
  return t('admin.mpay.records.legacy', { provider: p.provider })
}
</script>

<template>
  <div class="records">
    <div class="sums">
      <div class="kh-card sum"><span class="muted">{{ t('admin.mpay.records.collectedReal') }}</span><strong>{{ f.money(collectedReal) }}</strong></div>
      <div class="kh-card sum"><span class="muted">{{ t('admin.mpay.records.collectedDemo') }}</span><strong>{{ f.money(collectedDemo) }}</strong></div>
    </div>
    <div class="kh-card table-card">
      <table class="table">
        <thead>
          <tr>
            <th scope="col">{{ t('admin.payments.cols.receipt') }}</th>
            <th scope="col">{{ t('admin.payments.cols.order') }}</th>
            <th scope="col">{{ t('admin.payments.cols.customer') }}</th>
            <th scope="col">{{ t('admin.payments.cols.method') }}</th>
            <th scope="col">{{ t('admin.payments.cols.date') }}</th>
            <th scope="col">{{ t('admin.payments.cols.amount') }}</th>
            <th scope="col">{{ t('admin.payments.cols.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in payments" :key="p.id">
            <td class="ltr">{{ p.receiptNumber ?? p.providerReference ?? '—' }}</td>
            <td><NuxtLinkLocale v-if="p.orderNumber" :to="`/dashboard/requests/${p.orderNumber}`" class="ltr">{{ p.orderNumber }}</NuxtLinkLocale></td>
            <td>{{ p.customerName ?? '—' }}</td>
            <td>{{ methodLabel(p.method) }}<span class="src"> · {{ providerLabel(p) }}</span><span v-if="p.isDemo" class="demo"> · {{ t('mpay.demo.tag') }}</span></td>
            <td>{{ f.dateTime(p.createdAt) }}</td>
            <td class="amount">{{ f.money(p.amountMinor) }}</td>
            <td><UiBadge :tone="TONE[p.status] ?? 'neutral'">{{ t(`admin.payments.attempt.${p.status}`) }}</UiBadge></td>
          </tr>
          <tr v-if="!payments.length"><td colspan="7" class="empty">{{ t('admin.payments.empty') }}</td></tr>
        </tbody>
      </table>
    </div>
    <p class="muted foot">{{ t('admin.payments.footnote') }}</p>
  </div>
</template>

<style scoped>
.records { display: flex; flex-direction: column; gap: 12px; }
.sums { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 12px; }
.sum { padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.sum strong { font-size: 18px; color: var(--text-strong); }
.table-card { padding: 0; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 900px; font-size: 14px; }
.table th { background: var(--neutral-100); text-align: start; color: var(--text-muted); font-weight: 600; padding: 10px 16px; }
.table td { padding: 10px 16px; border-top: 1px solid var(--border-subtle); }
.amount { color: var(--text-strong); font-weight: 600; }
.src { font-size: 11px; color: var(--text-muted); }
.demo { font-size: 11px; color: var(--caution-500); font-weight: 700; }
.empty { text-align: center; color: var(--text-muted); padding: 32px; }
.foot { font-size: 12px; margin: 0; }
</style>
