<script setup lang="ts">
import type { OrderListItem } from '~/repositories/orders'

/** Overview card: active orders with their stage. */
defineProps<{ orders: OrderListItem[] }>()

const { t } = useI18n()
const f = useFormat()
</script>

<template>
  <section class="kh-card card">
    <div class="head">
      <h2 class="title">{{ t('account.activeOrders') }}</h2>
      <NuxtLinkLocale to="/account/orders" class="all">{{ t('common.viewAll') }}</NuxtLinkLocale>
    </div>
    <NuxtLinkLocale v-for="o in orders" :key="o.id" :to="`/account/orders/${o.orderNumber}`" class="row">
      <div class="row-top">
        <span class="service">{{ f.text(o.service.title) }}</span>
        <OrdersOrderStatusBadge :status="o.status" audience="client" />
      </div>
      <OrdersProgressBars :status="o.status" />
      <div class="meta"><span class="ltr">{{ o.orderNumber }}</span> · {{ f.date(o.createdAt) }}</div>
    </NuxtLinkLocale>
    <p v-if="!orders.length" class="empty">{{ t('account.noActive') }}</p>
  </section>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 14px; }
.head { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 17px; font-weight: 700; margin: 0; }
.all { font-size: 14px; }
.row {
  display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--border-subtle);
  padding: 14px 0 4px; color: inherit;
}
.row:hover .service { color: var(--text-accent); }
.row-top { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.service { font-weight: 600; color: var(--text-strong); }
.meta { font-size: 12px; color: var(--text-muted); }
.empty { margin: 0; color: var(--text-muted); font-size: 14px; }
</style>
