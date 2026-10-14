<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { canPay } from '#shared/domain/orderStatus'
import { fetchOrderDetail } from '~/repositories/orders'
import type { PaymentMethod } from '~/components/checkout/PaymentMethodPicker.vue'

/** Pay (or retry paying) an existing order. Amount comes from the server. */
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const { call, toFailure } = useApi()

const orderNumber = String(route.params.orderNumber)
const { data: order } = await useAsyncData(`checkout:${orderNumber}`, () => fetchOrderDetail(supabase, orderNumber))

const payable = computed(() => !!order.value && canPay(order.value.status, order.value.paymentStatus, order.value.service.pricingType === 'quote', !!order.value.quoteIssuedAt))
const lastFailure = computed(() => order.value?.payments.find(p => p.status === 'failed'))
const method = shallowRef<PaymentMethod>('card')
const busy = shallowRef(false)
const error = shallowRef('')

const meetingLabel = computed(() => {
  const b = order.value?.booking
  return b ? `${f.day(b.startsAt)}، ${f.time(b.startsAt)} – ${f.time(b.endsAt)}` : ''
})

async function pay() {
  if (!order.value) return
  busy.value = true
  error.value = ''
  try {
    const res = await call<{ redirectUrl: string }>(`/api/orders/${order.value.id}/checkout`, { method: 'POST', body: { method: method.value } })
    await navigateTo(res.redirectUrl, { external: /^https?:\/\//.test(res.redirectUrl) })
  }
  catch (err) {
    error.value = toFailure(err).message
  }
  finally {
    busy.value = false
  }
}

useSeoMeta({ title: () => t('checkout.payTitle'), robots: 'noindex' })
</script>

<template>
  <section class="wrap">
    <SharedAccessDenied v-if="!order" />
    <template v-else>
      <div class="top">
        <NuxtLinkLocale :to="`/account/orders/${order.orderNumber}`" class="back-link">{{ t('checkout.backToOrder') }}</NuxtLinkLocale>
        <h1 class="title">{{ t('checkout.payTitle') }} · <span class="ltr">{{ order.orderNumber }}</span></h1>
      </div>
      <div class="layout">
        <div class="main-col">
          <UiAlert v-if="lastFailure && order.paymentStatus === 'failed'" :title="t('checkout.failedTitle')">
            {{ t('checkout.failedBody') }}
          </UiAlert>
          <UiAlert v-if="error">{{ error }}</UiAlert>
          <template v-if="payable">
            <CheckoutAnswersSummary :fields="order.formFields" :answers="order.formAnswers" :meeting-label="meetingLabel" />
            <CheckoutPaymentMethodPicker v-model="method" />
            <div class="actions">
              <UiButton size="lg" :loading="busy" @click="pay">
                {{ order.paymentStatus === 'failed' ? t('request.retryPay', { amount: f.money(order.totalMinor) }) : t('request.pay', { amount: f.money(order.totalMinor) }) }}
              </UiButton>
            </div>
          </template>
          <UiEmptyState v-else :title="t('checkout.notPayableTitle')" :description="t('checkout.notPayableBody')">
            <UiButton variant="secondary" :to="`/account/orders/${order.orderNumber}`">{{ t('checkout.backToOrder') }}</UiButton>
          </UiEmptyState>
        </div>
        <CheckoutOrderSummaryAside
          :title="order.service.title"
          :base-minor="order.baseMinor"
          :is-quote="false"
          :addons="order.addons"
          :total-minor="order.totalMinor"
          :meeting-label="meetingLabel"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.wrap { max-width: 1080px; margin: 0 auto; padding: clamp(24px, 4vw, 48px) var(--container-pad) 96px; display: flex; flex-direction: column; gap: 24px; }
.back-link { font-size: 13px; }
.title { font-size: clamp(24px, 3vw, 34px); font-weight: 800; margin: 6px 0 0; }
.layout { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
.main-col { flex: 1 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
.actions { display: flex; justify-content: flex-end; }
</style>
