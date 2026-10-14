<script setup lang="ts">
import type { OrderListItem } from '~/repositories/orders'

defineProps<{ order: OrderListItem }>()
const f = useFormat()
</script>

<template>
  <NuxtLinkLocale :to="`/account/orders/${order.orderNumber}`" class="kh-card kh-card--interactive card">
    <div class="main">
      <span class="service">{{ f.text(order.service.title) }}</span>
      <span class="meta"><span class="ltr">{{ order.orderNumber }}</span> · {{ f.date(order.createdAt) }} · {{ f.money(order.totalMinor) }}</span>
    </div>
    <div class="bars"><OrdersProgressBars :status="order.status" /></div>
    <div class="badges">
      <OrdersOrderStatusBadge :status="order.status" audience="client" />
      <OrdersPaymentBadge :status="order.paymentStatus" />
    </div>
  </NuxtLinkLocale>
</template>

<style scoped>
.card { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; padding: 18px 20px; color: inherit; }
.main { flex: 1 1 240px; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.service { font-weight: 700; color: var(--text-strong); font-size: 16px; }
.meta { font-size: 13px; color: var(--text-muted); }
.bars { flex: 0 1 180px; min-width: 120px; }
.badges { display: flex; gap: 6px; flex-wrap: wrap; }
</style>
