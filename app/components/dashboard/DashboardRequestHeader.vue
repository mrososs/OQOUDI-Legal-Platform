<script setup lang="ts">
import { staffStatusOptions, type OrderStatus } from '#shared/domain/orderStatus'
import type { OrderDetail } from '~/repositories/orders'

/** Title row + status control + "request information" action. */
const props = defineProps<{
  order: OrderDetail
  customerName: string
  isAdmin: boolean
  busy: string | null
}>()

const emit = defineEmits<{
  changeStatus: [status: OrderStatus]
  requestInfo: [message: string]
}>()

const { t } = useI18n()
const f = useFormat()

const options = computed(() => staffStatusOptions(props.order.status, props.order.service.kind, props.isAdmin)
  .map(s => ({ value: s, label: t(`status.${s}.label`) })))
const next = shallowRef<string>('')
watch(() => props.order.status, () => {
  next.value = ''
})

const canRequestInfo = computed(() => ['under_review', 'in_progress', 'revision'].includes(props.order.status))
const infoOpen = shallowRef(false)
const infoMessage = shallowRef('')
const infoError = shallowRef('')

function apply() {
  if (next.value) emit('changeStatus', next.value as OrderStatus)
}

function submitInfo() {
  if (infoMessage.value.trim().length < 5) {
    infoError.value = t('formErrors.minLength', { min: f.number(5) })
    return
  }
  emit('requestInfo', infoMessage.value.trim())
  infoOpen.value = false
  infoMessage.value = ''
  infoError.value = ''
}
</script>

<template>
  <div class="header">
    <NuxtLinkLocale to="/dashboard/requests" class="back">{{ t('dashOps.backToRequests') }}</NuxtLinkLocale>
    <div class="row">
      <div>
        <h1 class="title">{{ f.text(order.service.title) }}</h1>
        <div class="meta"><span class="ltr">{{ order.orderNumber }}</span> · {{ customerName }} · {{ f.dateTime(order.createdAt) }}</div>
        <div v-if="order.hasVipDelivery || order.hasBilingualDrafting" class="addon-line">
          <OrdersOrderAddonBadges :vip="order.hasVipDelivery" :bilingual="order.hasBilingualDrafting" />
          <span v-if="order.hasVipDelivery" class="vip-note">{{ t('orders.vipNote') }}</span>
        </div>
      </div>
      <div class="controls">
        <OrdersPaymentBadge :status="order.paymentStatus" prefix />
        <OrdersOrderStatusBadge :status="order.status" />
        <template v-if="options.length">
          <div class="select">
            <UiSelect v-model="next" :options="options" :placeholder="t('dashOps.changeStatus')" :aria-label="t('dashOps.changeStatus')" />
          </div>
          <UiButton size="sm" :disabled="!next" :loading="busy === 'status'" @click="apply">{{ t('dashOps.apply') }}</UiButton>
        </template>
        <UiButton v-if="canRequestInfo" variant="secondary" size="sm" @click="infoOpen = true">{{ t('dashOps.requestInfo') }}</UiButton>
      </div>
    </div>
    <p class="hint">{{ t(`status.${order.status}.hint`) }}</p>

    <UiModal v-model:open="infoOpen" :title="t('dashOps.requestInfo')" :description="t('dashOps.requestInfoHelp')">
      <UiTextarea v-model="infoMessage" :label="t('dashOps.requestInfoLabel')" :rows="4" :error="infoError" />
      <template #footer>
        <UiButton variant="ghost" @click="infoOpen = false">{{ t('common.cancel') }}</UiButton>
        <UiButton :loading="busy === 'request-info'" @click="submitInfo">{{ t('dashOps.sendAndRequest') }}</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.header { display: flex; flex-direction: column; gap: 6px; }
.back { font-size: 13px; align-self: flex-start; }
.row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 800; margin: 0; }
.meta { color: var(--text-muted); margin-top: 2px; }
.addon-line { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
.vip-note { font-size: 12px; color: var(--text-muted); }
.controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.select { width: 200px; }
.hint { margin: 0; font-size: 13px; color: var(--text-muted); }
</style>
