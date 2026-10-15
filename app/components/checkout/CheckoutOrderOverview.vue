<script setup lang="ts">
import type { OrderDetail } from '~/repositories/orders'

/** Step 1: what is being paid for. Amounts shown come from the order row (server-calculated). */
defineProps<{ order: OrderDetail, customer: { name: string, email: string, phone: string | null } | null, meetingLabel?: string }>()
const { t } = useI18n()
const f = useFormat()
</script>

<template>
  <dl class="grid">
    <div><dt>{{ t('confirm.service') }}</dt><dd>{{ f.text(order.service.title) }}</dd></div>
    <div><dt>{{ t('confirm.orderNumber') }}</dt><dd class="ltr">{{ order.orderNumber }}</dd></div>
    <div><dt>{{ t('mpay.overview.delivery') }}</dt><dd>{{ meetingLabel || f.text(order.service.deliveryEstimate) }}</dd></div>
    <div><dt>{{ t('services.total') }}</dt><dd class="total">{{ f.money(order.totalMinor) }}</dd></div>
    <div v-if="customer" class="wide">
      <dt>{{ t('mpay.overview.customer') }}</dt>
      <dd>{{ customer.name }} · <span class="ltr">{{ customer.email }}</span><template v-if="customer.phone"> · <span class="ltr">{{ customer.phone }}</span></template></dd>
    </div>
  </dl>
</template>

<style scoped>
.grid { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px; }
.grid > div { background: var(--neutral-100); border-radius: 12px; padding: 12px 14px; min-width: 0; }
.wide { grid-column: 1 / -1; }
dt { font-size: 12px; color: var(--text-muted); }
dd { margin: 2px 0 0; font-weight: 700; color: var(--text-strong); overflow-wrap: anywhere; }
.total { font-family: var(--font-heading); font-size: 20px; }
</style>
