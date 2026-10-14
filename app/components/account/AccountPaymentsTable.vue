<script setup lang="ts">
import type { Tone } from '#shared/domain/orderStatus'
import { canPay } from '#shared/domain/orderStatus'
import type { PaymentRow } from '~/repositories/account'

defineProps<{ rows: PaymentRow[] }>()

const { t } = useI18n()
const f = useFormat()

const TONE: Record<PaymentRow['status'], Tone> = {
  initiated: 'neutral', pending: 'caution', succeeded: 'positive', failed: 'critical', expired: 'neutral', cancelled: 'neutral',
}
</script>

<template>
  <div class="kh-card wrap">
    <table class="table">
      <thead>
        <tr>
          <th scope="col">{{ t('account.payments.cols.order') }}</th>
          <th scope="col">{{ t('account.payments.cols.service') }}</th>
          <th scope="col">{{ t('account.payments.cols.date') }}</th>
          <th scope="col">{{ t('account.payments.cols.method') }}</th>
          <th scope="col">{{ t('account.payments.cols.amount') }}</th>
          <th scope="col">{{ t('account.payments.cols.status') }}</th>
          <th scope="col">{{ t('account.payments.cols.receipt') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in rows" :key="p.id">
          <td><NuxtLinkLocale :to="`/account/orders/${p.orderNumber}`" class="ltr">{{ p.orderNumber }}</NuxtLinkLocale></td>
          <td class="strong">{{ f.text(p.serviceTitle) }}</td>
          <td>{{ f.date(p.createdAt) }}</td>
          <td>{{ t(`checkout.methods.${p.method}.label`) }}</td>
          <td class="strong">{{ f.money(p.amountMinor) }}</td>
          <td><UiBadge :tone="TONE[p.status]">{{ t(`account.payments.status.${p.status}`) }}</UiBadge></td>
          <td>
            <span v-if="p.receiptNumber" class="ltr">{{ p.receiptNumber }}</span>
            <NuxtLinkLocale
              v-else-if="p.status === 'failed' && canPay(p.orderStatus, p.orderPaymentStatus, false, true)"
              :to="`/checkout/${p.orderNumber}`"
              class="retry"
            >
              {{ t('account.payments.completePay') }}
            </NuxtLinkLocale>
            <span v-else class="muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.wrap { padding: 0; overflow-x: auto; overflow-y: hidden; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 760px; }
th { background: var(--neutral-100); text-align: start; padding: 12px 16px; font-weight: 600; color: var(--text-muted); }
td { padding: 12px 16px; border-top: 1px solid var(--border-subtle); }
.strong { color: var(--text-strong); font-weight: 600; }
.retry { color: var(--critical-500); font-weight: 600; }
</style>
