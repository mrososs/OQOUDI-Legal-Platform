<script setup lang="ts">
import { CUSTOMER_ACTION_STATUSES } from '#shared/domain/orderStatus'
import type { OrderListItem } from '~/repositories/orders'

/** "يتطلب إجراءً منك" — orders waiting for the customer. */
const props = defineProps<{ orders: OrderListItem[] }>()

const { t } = useI18n()
const f = useFormat()

const actions = computed(() => props.orders
  .filter(o => CUSTOMER_ACTION_STATUSES.includes(o.status) && !(o.status === 'awaiting_payment' && o.paymentStatus === 'paid'))
  .map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    service: f.text(o.service.title),
    hint: t(`status.${o.status}.hint`),
    cta: t(`account.cta.${o.status}`),
    to: o.status === 'awaiting_payment'
      ? `/checkout/${o.orderNumber}`
      : { path: `/account/orders/${o.orderNumber}`, query: o.status === 'awaiting_info' ? { tab: 'messages' } : {} },
  })))
</script>

<template>
  <section v-if="actions.length" class="actions">
    <h2 class="title">{{ t('account.actionsTitle', { n: f.number(actions.length) }) }}</h2>
    <div v-for="a in actions" :key="a.id" class="action">
      <span class="dot" aria-hidden="true" />
      <div class="text">
        <div class="head"><strong>{{ a.service }}</strong><span class="no ltr">{{ a.orderNumber }}</span></div>
        <div class="hint">{{ a.hint }}</div>
      </div>
      <UiButton size="sm" :to="a.to">{{ a.cta }}</UiButton>
    </div>
  </section>
</template>

<style scoped>
.actions { display: flex; flex-direction: column; gap: 12px; }
.title { font-size: 16px; font-weight: 700; margin: 0; color: var(--text-strong); font-family: var(--font-sans); }
.action {
  display: flex; gap: 16px; align-items: center; flex-wrap: wrap; background: #fff;
  border: 1px solid var(--gold-300); border-radius: 16px; padding: 16px 18px;
}
.dot { width: 10px; height: 10px; border-radius: 50%; background: var(--gold-400); flex-shrink: 0; }
.text { flex: 1 1 260px; min-width: 0; }
.head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.head strong { color: var(--text-strong); }
.no { font-size: 12px; color: var(--text-muted); }
.hint { font-size: 14px; line-height: 1.6; }
</style>
