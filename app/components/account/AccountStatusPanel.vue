<script setup lang="ts">
import { CUSTOMER_ACTION_STATUSES, canCustomerCancel, canPay } from '#shared/domain/orderStatus'
import type { OrderDetail } from '~/repositories/orders'

/** Progress stepper + "what happens now / what we need from you" callout with actions. */
const props = defineProps<{ order: OrderDetail, busy: string | null }>()
const emit = defineEmits<{ accept: [], revise: [], rate: [], cancel: [] }>()

const { t } = useI18n()
const f = useFormat()

const o = computed(() => props.order)
const isQuote = computed(() => o.value.service.pricingType === 'quote')
const needsAction = computed(() => CUSTOMER_ACTION_STATUSES.includes(o.value.status) && !(o.value.status === 'awaiting_payment' && !canPay(o.value.status, o.value.paymentStatus, isQuote.value, !!o.value.quoteIssuedAt)))
const calloutTitle = computed(() => t(needsAction.value ? 'account.order.calloutAction' : 'account.order.calloutNow', { status: t(`status.${o.value.status}.client`) }))
const hint = computed(() => {
  if (o.value.status === 'new' && isQuote.value) return t('account.order.quotePending')
  if (o.value.status === 'awaiting_payment' && isQuote.value && o.value.quoteIssuedAt) return t('account.order.quoteReady', { amount: f.money(o.value.totalMinor) })
  return t(`status.${o.value.status}.hint`)
})
const payable = computed(() => canPay(o.value.status, o.value.paymentStatus, isQuote.value, !!o.value.quoteIssuedAt))
const payFailed = computed(() => o.value.paymentStatus === 'failed' && o.value.status === 'awaiting_payment')
const canAccept = computed(() => o.value.status === 'delivered')
const canRevise = computed(() => o.value.status === 'delivered' && o.value.service.kind === 'standard' && o.value.deliveries.length > 0)
const canRate = computed(() => o.value.status === 'completed' && !o.value.review)
const cancellable = computed(() => canCustomerCancel(o.value.status, o.value.paymentStatus))
</script>

<template>
  <div class="kh-card panel">
    <OrdersOrderStepper :status="order.status" />
    <div class="callout" :class="{ action: needsAction, cancelled: order.status === 'cancelled' }">
      <div class="callout-text">
        <div class="callout-title">{{ calloutTitle }}</div>
        <div class="callout-hint">{{ hint }}</div>
        <div v-if="order.status === 'cancelled' && order.cancelReason" class="callout-hint">{{ t('account.order.cancelReason', { reason: order.cancelReason }) }}</div>
      </div>
      <div class="callout-actions">
        <template v-if="canAccept">
          <UiButton size="sm" :loading="busy === 'accept'" @click="emit('accept')">{{ t('account.order.accept') }}</UiButton>
          <UiButton v-if="canRevise" variant="secondary" size="sm" @click="emit('revise')">{{ t('account.order.revise') }}</UiButton>
        </template>
        <UiButton v-if="payable" size="sm" :to="`/checkout/${order.orderNumber}`">
          {{ (payFailed ? t('account.order.retryPay', { amount: f.money(order.totalMinor) }) : t('account.order.pay', { amount: f.money(order.totalMinor) })) }}
        </UiButton>
        <UiButton v-if="order.status === 'awaiting_info'" size="sm" :to="{ path: `/account/orders/${order.orderNumber}`, query: { tab: 'messages' } }">{{ t('account.cta.awaiting_info') }}</UiButton>
        <UiButton v-if="canRate" size="sm" @click="emit('rate')">{{ t('account.order.rate') }}</UiButton>
        <span v-if="order.review" class="rated">{{ t('account.order.yourRating') }} <SharedStarRating :value="order.review.rating" /></span>
        <UiButton v-if="cancellable" variant="ghost" size="sm" :loading="busy === 'cancel'" @click="emit('cancel')">{{ t('account.order.cancel') }}</UiButton>
      </div>
    </div>
    <div v-if="payFailed" class="failed" role="alert">{{ t('account.order.payFailed') }}</div>
  </div>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 18px; padding: 20px 22px; }
.callout { display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap; background: var(--neutral-100); border-radius: 14px; padding: 16px 18px; }
.callout.action { background: var(--cream-50); }
.callout.cancelled { background: var(--critical-100); }
.callout-text { flex: 1 1 280px; }
.callout-title { font-weight: 700; color: var(--text-strong); margin-bottom: 4px; }
.callout-hint { font-size: 14px; line-height: 1.7; }
.callout-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.rated { font-size: 14px; color: var(--text-strong); display: inline-flex; gap: 6px; align-items: center; }
.failed { font-size: 13px; color: var(--critical-500); }
</style>
