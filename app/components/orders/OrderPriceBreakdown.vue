<script setup lang="ts">
import type { OrderDetail } from '~/repositories/orders'

/**
 * Immutable price snapshot of an order: what was charged for the service and each add-on,
 * and — when the launch offer applied — the regular price it replaced. Old orders (placed
 * before the campaign feature) simply show what they were charged.
 */
const props = defineProps<{ order: OrderDetail }>()

const { t } = useI18n()
const f = useFormat()

const launch = computed(() => props.order.service.pricingMode === 'launch' && props.order.service.regularPriceMinor !== undefined)
</script>

<template>
  <div class="breakdown">
    <div class="row">
      <span class="k">{{ t('account.summary.service') }}</span>
      <span class="v">
        <s v-if="launch" class="was">{{ f.money(order.service.regularPriceMinor!) }}</s>
        {{ f.money(order.baseMinor) }}
      </span>
    </div>
    <div v-for="a in order.addons" :key="a.id" class="row sub">
      <span class="k">+ {{ f.text(a.title) }}</span>
      <span class="v">
        <s v-if="a.pricingApplied === 'launch' && a.regularPriceMinor" class="was">{{ f.money(a.regularPriceMinor) }}</s>
        {{ f.money(a.priceMinor) }}
      </span>
    </div>
    <div v-if="launch" class="tag">{{ t('orders.launchPricing') }}</div>
    <div class="row total"><span class="k">{{ t('account.summary.amount') }}</span><strong>{{ f.money(order.totalMinor) }}</strong></div>
  </div>
</template>

<style scoped>
.breakdown { display: flex; flex-direction: column; gap: 8px; }
.row { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.sub { font-size: 13px; }
.k { color: var(--text-muted); }
.v { text-align: end; }
.was { color: var(--text-muted); font-size: 12px; margin-inline-end: 6px; text-decoration-color: var(--critical-500); }
.total { border-top: 1px solid var(--border-subtle); padding-top: 8px; }
.total strong { color: var(--text-strong); }
.tag {
  align-self: flex-start; font-size: 11px; font-weight: 700; color: var(--gold-700); background: var(--gold-50);
  border: 1px solid var(--gold-200); border-radius: 999px; padding: 1px 9px;
}
</style>
