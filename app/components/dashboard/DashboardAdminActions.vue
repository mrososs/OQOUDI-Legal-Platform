<script setup lang="ts">
import type { OrderDetail } from '~/repositories/orders'
import type { LawyerOption } from '~/repositories/dashboard'

/** Admin-only controls: issue quote, (re)assign lawyer, cancel. Server re-checks the admin role. */
const props = defineProps<{
  order: OrderDetail
  lawyers: LawyerOption[]
  busy: string | null
}>()

const emit = defineEmits<{
  quote: [payload: { amountMinor: number, note: string }]
  assign: [lawyerId: string]
  cancel: [reason: string]
}>()

const { t } = useI18n()

const canQuote = computed(() => props.order.status === 'new' && props.order.service.pricingType === 'quote')
const canCancel = computed(() => !['completed', 'cancelled'].includes(props.order.status))

const amount = shallowRef('')
const quoteNote = shallowRef('')
const amountError = shallowRef('')
const lawyerId = shallowRef(props.order.assignedLawyerId ?? '')
const cancelOpen = shallowRef(false)
const cancelReason = shallowRef('')

watch(() => props.order.assignedLawyerId, (v) => {
  lawyerId.value = v ?? ''
})

const lawyerOptions = computed(() => props.lawyers.map(l => ({ value: l.id, label: l.name })))

function submitQuote() {
  const pounds = Number(amount.value)
  if (!Number.isFinite(pounds) || pounds <= 0) {
    amountError.value = t('errors.OQ422_AMOUNT')
    return
  }
  amountError.value = ''
  emit('quote', { amountMinor: Math.round(pounds * 100), note: quoteNote.value.trim() })
}

function confirmCancel() {
  emit('cancel', cancelReason.value.trim())
  cancelOpen.value = false
}
</script>

<template>
  <section class="kh-card card">
    <h2 class="title">{{ t('dashOps.adminActions') }}</h2>

    <div v-if="canQuote" class="block">
      <h3 class="sub">{{ t('dashOps.issueQuote') }}</h3>
      <UiInput v-model="amount" type="number" inputmode="decimal" :min="1" :label="t('dashOps.quoteAmount')" :error="amountError" />
      <UiInput v-model="quoteNote" :label="t('dashOps.quoteNote')" :maxlength="500" />
      <UiButton size="sm" :loading="busy === 'quote'" @click="submitQuote">{{ t('dashOps.sendQuote') }}</UiButton>
    </div>

    <div class="block">
      <h3 class="sub">{{ t('dashOps.assignLawyer') }}</h3>
      <UiSelect v-model="lawyerId" :options="lawyerOptions" :placeholder="t('dashOps.unassigned')" :aria-label="t('dashOps.assignLawyer')" />
      <UiButton
        size="sm"
        variant="secondary"
        :disabled="!lawyerId || lawyerId === order.assignedLawyerId"
        :loading="busy === 'assign'"
        @click="emit('assign', lawyerId)"
      >
        {{ t('dashOps.assign') }}
      </UiButton>
    </div>

    <div v-if="canCancel" class="block">
      <UiButton variant="ghost" size="sm" @click="cancelOpen = true">{{ t('dashOps.cancelOrder') }}</UiButton>
      <p v-if="order.paymentStatus === 'paid'" class="muted small no-margin">{{ t('dashOps.cancelRefundNote') }}</p>
    </div>

    <UiModal v-model:open="cancelOpen" :title="t('dashOps.cancelOrder')" :description="t('dashOps.cancelConfirm')">
      <UiTextarea v-model="cancelReason" :label="t('dashOps.cancelReason')" :rows="3" :maxlength="1000" />
      <template #footer>
        <UiButton variant="ghost" @click="cancelOpen = false">{{ t('common.back') }}</UiButton>
        <UiButton variant="danger" :loading="busy === 'cancel'" @click="confirmCancel">{{ t('dashOps.cancelOrder') }}</UiButton>
      </template>
    </UiModal>
  </section>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 12px; border-color: var(--gold-300); }
.title { font-size: 15px; font-weight: 700; margin: 0; }
.block { display: flex; flex-direction: column; gap: 8px; align-items: stretch; padding-top: 10px; border-top: 1px solid var(--border-subtle); }
.block > :deep(.kh-btn) { align-self: flex-start; }
.sub { font-size: 14px; font-weight: 700; margin: 0; }
.small { font-size: 12px; }
.no-margin { margin: 0; }
</style>
