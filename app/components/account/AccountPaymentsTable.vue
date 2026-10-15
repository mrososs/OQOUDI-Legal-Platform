<script setup lang="ts">
import type { Tone } from '#shared/domain/orderStatus'
import type { PaymentRow } from '~/repositories/account'

/** Customer payment history: manual proof submissions and historical gateway attempts. */
defineProps<{ rows: PaymentRow[] }>()
const emit = defineEmits<{ viewProof: [row: PaymentRow] }>()

const { t, te } = useI18n()
const f = useFormat()

const TONE: Record<PaymentRow['status'], Tone> = {
  initiated: 'neutral', pending: 'caution', succeeded: 'positive', failed: 'critical', expired: 'neutral', cancelled: 'neutral',
}

function methodLabel(method: string) {
  return te(`mpay.methods.${method}.label`) ? t(`mpay.methods.${method}.label`) : t(`checkout.methods.${method}.label`)
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
          <td>
            <span class="method">
              <PaymentsPaymentMethodLogo v-if="p.provider === 'manual'" :method="p.method" size="sm" />
              {{ methodLabel(p.method) }}
            </span>
          </td>
          <td class="strong">{{ f.money(p.amountMinor) }}</td>
          <td>
            <PaymentsPaymentVerificationBadge v-if="p.verification" :status="p.verification.status" :demo="p.isDemo" />
            <UiBadge v-else :tone="TONE[p.status]">{{ t(`account.payments.status.${p.status}`) }}</UiBadge>
          </td>
          <td>
            <span v-if="p.receiptNumber" class="ltr">{{ p.receiptNumber }}</span>
            <button v-else-if="p.verification" type="button" class="link" @click="emit('viewProof', p)">{{ t('mpay.proof.view') }}</button>
            <span v-else class="muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.wrap { padding: 0; overflow-x: auto; overflow-y: hidden; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 820px; }
th { background: var(--neutral-100); text-align: start; padding: 12px 16px; font-weight: 600; color: var(--text-muted); }
td { padding: 12px 16px; border-top: 1px solid var(--border-subtle); }
.strong { color: var(--text-strong); font-weight: 600; }
.method { display: inline-flex; align-items: center; gap: 8px; }
.link { border: 0; background: none; padding: 0; font: inherit; font-weight: 700; color: var(--text-accent); cursor: pointer; text-decoration: underline; }
</style>
