<script setup lang="ts">
import type { OrderDetail } from '~/repositories/orders'

/** Staff view of the order's price snapshot: service, selected add-ons (VIP / bilingual) and launch vs regular pricing. */
defineProps<{ order: OrderDetail }>()
const { t } = useI18n()
</script>

<template>
  <section class="kh-card card">
    <h2 class="title">{{ t('orders.priceSnapshot') }}</h2>
    <OrdersOrderAddonBadges :vip="order.hasVipDelivery" :bilingual="order.hasBilingualDrafting" />
    <OrdersOrderPriceBreakdown :order="order" />
  </section>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 10px; }
.title { font-size: 15px; font-weight: 700; margin: 0; }
</style>
