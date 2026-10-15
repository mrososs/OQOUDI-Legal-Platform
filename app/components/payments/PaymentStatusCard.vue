<script setup lang="ts">
import { CheckCircle2, Clock, Upload, XCircle } from '@lucide/vue'
import { manualPaymentState, type ManualPaymentState } from '#shared/domain/manualPayments'
import type { OrderDetail } from '~/repositories/orders'

/**
 * Customer-facing manual payment status (A awaiting proof · B under review ·
 * C approved · D rejected). Renders nothing for orders that never needed a
 * manual payment (quotes not issued yet, legacy gateway payments, cancelled).
 */
const props = withDefaults(defineProps<{ order: OrderDetail, maxAttempts?: number, showCheckoutLink?: boolean }>(), {
  maxAttempts: 3,
  showCheckoutLink: true,
})

const { t } = useI18n()
const f = useFormat()

const info = computed(() => manualPaymentState(props.order, props.maxAttempts))
const state = computed<ManualPaymentState | null>(() => info.value.state)
const latest = computed(() => props.order.manualSubmissions[0] ?? null)
const receipt = computed(() => props.order.payments.find(p => p.status === 'succeeded')?.receiptNumber ?? null)
const proofOpen = shallowRef(false)

const ICON = { awaiting: Upload, pending: Clock, approved: CheckCircle2, rejected: XCircle } as const
</script>

<template>
  <section v-if="state" class="kh-card card" :class="`card--${state}`" aria-live="polite">
    <div class="head">
      <span class="icon" aria-hidden="true"><component :is="ICON[state]" :size="22" :stroke-width="2" /></span>
      <div class="head-text">
        <h2 class="title">{{ t(`mpay.status.${state}.title`) }}</h2>
        <p class="body">{{ t(`mpay.status.${state}.body`) }}</p>
      </div>
      <UiBadge v-if="latest?.demo" tone="neutral">{{ t('mpay.demo.tag') }}</UiBadge>
    </div>

    <dl v-if="latest && state !== 'awaiting'" class="facts">
      <div><dt>{{ t('mpay.facts.method') }}</dt><dd class="method"><PaymentsPaymentMethodLogo :method="latest.method" size="sm" />{{ t(`mpay.methods.${latest.method}.label`) }}</dd></div>
      <div><dt>{{ t('mpay.facts.amount') }}</dt><dd>{{ f.money(latest.amountMinor) }}</dd></div>
      <div><dt>{{ t('mpay.facts.submittedAt') }}</dt><dd>{{ f.dateTime(latest.submittedAt) }}</dd></div>
      <div v-if="latest.reviewedAt"><dt>{{ t('mpay.facts.reviewedAt') }}</dt><dd>{{ f.dateTime(latest.reviewedAt) }}</dd></div>
      <div v-if="state === 'approved' && receipt"><dt>{{ t('mpay.facts.receipt') }}</dt><dd class="ltr">{{ receipt }}</dd></div>
    </dl>

    <p v-if="state === 'rejected' && latest?.rejectionReason" class="reason">
      <strong>{{ t('mpay.facts.reason') }}:</strong> {{ latest.rejectionReason }}
    </p>
    <p v-if="state === 'rejected'" class="muted small">
      {{ info.canResubmit ? t('mpay.attemptsLeft', { n: f.number(info.attemptsLeft) }, info.attemptsLeft) : t('mpay.attemptsExhausted') }}
    </p>

    <div class="actions">
      <UiButton v-if="state === 'awaiting' && showCheckoutLink" size="sm" :to="`/checkout/${order.orderNumber}`">
        {{ t('mpay.payNow', { amount: f.money(order.totalMinor) }) }}
      </UiButton>
      <UiButton v-if="latest && state !== 'awaiting'" variant="secondary" size="sm" @click="proofOpen = true">{{ t('mpay.proof.view') }}</UiButton>
      <template v-if="state === 'rejected'">
        <UiButton v-if="info.canResubmit && showCheckoutLink" size="sm" :to="`/checkout/${order.orderNumber}`">{{ t('mpay.resubmit') }}</UiButton>
        <UiButton variant="ghost" size="sm" to="/contact">{{ t('mpay.contactUs') }}</UiButton>
      </template>
    </div>

    <PaymentsProofPreviewModal v-model:open="proofOpen" :submission-id="latest?.id ?? null" :demo="latest?.demo" />
  </section>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 14px; border-inline-start: 4px solid var(--card-accent, var(--border-strong)); }
.card--awaiting { --card-accent: var(--gold-500); --card-soft: var(--gold-50); }
.card--pending { --card-accent: var(--caution-500); --card-soft: var(--caution-100); }
.card--approved { --card-accent: var(--positive-500); --card-soft: var(--positive-100); }
.card--rejected { --card-accent: var(--critical-500); --card-soft: var(--critical-100); }
.head { display: flex; gap: 12px; align-items: flex-start; }
.icon {
  width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  background: var(--card-soft); color: var(--card-accent);
}
.head-text { flex: 1; min-width: 0; }
.title { font-size: 18px; font-weight: 800; margin: 0 0 4px; }
.body { margin: 0; font-size: 14px; line-height: 1.8; }
.facts {
  margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap: 10px;
  background: var(--neutral-100); border-radius: 14px; padding: 14px;
}
.facts dt { font-size: 12px; color: var(--text-muted); }
.facts dd { margin: 0; font-weight: 700; color: var(--text-strong); }
.method { display: flex; align-items: center; gap: 8px; }
.reason { margin: 0; font-size: 14px; background: var(--critical-100); color: var(--critical-500); border-radius: 12px; padding: 10px 14px; }
.small { font-size: 12px; margin: 0; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
