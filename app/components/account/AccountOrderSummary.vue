<script setup lang="ts">
import type { OrderDetail } from '~/repositories/orders'

defineProps<{ order: OrderDetail, lawyerName?: string | null }>()

const { t } = useI18n()
const f = useFormat()
</script>

<template>
  <aside class="kh-card aside">
    <div class="title">{{ t('account.summary.title') }}</div>
    <div class="row"><span class="k">{{ t('account.summary.service') }}</span><span>{{ f.text(order.service.title) }}</span></div>
    <div class="row"><span class="k">{{ t('account.summary.amount') }}</span><strong>{{ f.money(order.totalMinor) }}</strong></div>
    <div v-for="a in order.addons" :key="a.id" class="row sub"><span class="k">+ {{ f.text(a.title) }}</span><span>{{ f.money(a.priceMinor) }}</span></div>
    <div class="row"><span class="k">{{ t('account.summary.payment') }}</span><OrdersPaymentBadge :status="order.paymentStatus" /></div>
    <template v-for="p in order.payments" :key="p.id">
      <div v-if="p.receiptNumber" class="row"><span class="k">{{ t('account.summary.receipt') }}</span><span class="ltr">{{ p.receiptNumber }}</span></div>
    </template>
    <div class="row"><span class="k">{{ t('account.summary.lawyer') }}</span><span>{{ lawyerName ?? t('account.summary.lawyerPending') }}</span></div>
    <div class="row"><span class="k">{{ t('account.summary.duration') }}</span><span>{{ f.text(order.service.deliveryEstimate) }}</span></div>
    <div class="row"><span class="k">{{ t('account.summary.created') }}</span><span>{{ f.date(order.createdAt) }}</span></div>
    <div class="privacy">{{ t('account.summary.privacy') }}</div>
  </aside>
</template>

<style scoped>
.aside { flex: 1 1 280px; max-width: 100%; display: flex; flex-direction: column; gap: 12px; font-size: 14px; }
.title { font-weight: 700; color: var(--text-strong); }
.row { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.row strong { color: var(--text-strong); }
.sub { font-size: 13px; }
.k { color: var(--text-muted); }
.privacy { font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 12px; line-height: 1.6; }
</style>
