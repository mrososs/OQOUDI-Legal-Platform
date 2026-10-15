<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { manualPaymentState } from '#shared/domain/manualPayments'
import { fetchOrderDetail } from '~/repositories/orders'

/**
 * Manual payment checkout: summary → method → transfer instructions →
 * proof upload → submit for admin review. The amount always comes from
 * the server; nothing here marks the order paid.
 */
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const session = useSessionStore()
const localePath = useLocalePath()

const orderNumber = String(route.params.orderNumber)
const { data: order } = await useAsyncData(`checkout:${orderNumber}`, async () => {
  const o = await fetchOrderDetail(supabase, orderNumber)
  // Staff can read assigned orders via RLS; checkout is for the order's customer account only.
  return o && o.customerAccountId === session.account?.id ? o : null
})

const checkout = useManualCheckout(() => order.value?.id)
const config = computed(() => checkout.config.data.value)
const maxAttempts = computed(() => config.value?.maxAttempts ?? 3)
const payment = computed(() => (order.value ? manualPaymentState(order.value, maxAttempts.value) : null))
const showFlow = computed(() => !!payment.value?.canSubmit)
const sampleBusy = shallowRef(false)

const meetingLabel = computed(() => {
  const b = order.value?.booking
  return b ? `${f.day(b.startsAt)}، ${f.time(b.startsAt)} – ${f.time(b.endsAt)}` : ''
})
const customer = computed(() => (session.profile ? { name: session.profile.fullName, email: session.profile.email, phone: session.profile.phone } : null))

async function useSample() {
  if (!order.value) return
  sampleBusy.value = true
  try {
    const methodLabel = checkout.method.value ? t(`mpay.methods.${checkout.method.value}.label`) : '—'
    checkout.setFile(await createSampleProof({ orderNumber: order.value.orderNumber, method: methodLabel, amount: f.money(order.value.totalMinor) }))
  }
  catch {
    useToast().error(t('mpay.proof.errors.sample'))
  }
  finally {
    sampleBusy.value = false
  }
}

async function submit() {
  const result = await checkout.submit()
  if (result) await navigateTo(localePath(`/checkout/${result.orderNumber}/confirmation`))
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

      <PaymentsPaymentDemoNotice v-if="config?.demo" />

      <div class="layout">
        <div class="main-col">
          <template v-if="showFlow">
            <PaymentsPaymentStatusCard v-if="payment?.state === 'rejected'" :order="order" :max-attempts="maxAttempts" :show-checkout-link="false" />

            <CheckoutStep :step="1" :title="t('mpay.steps.summary')" done>
              <CheckoutOrderOverview :order="order" :customer="customer" :meeting-label="meetingLabel" />
            </CheckoutStep>

            <CheckoutStep :step="2" :title="t('mpay.steps.method')" :done="!!checkout.method.value">
              <div v-if="checkout.config.pending.value" class="skeleton" aria-busy="true">{{ t('common.loading') }}</div>
              <UiAlert v-else-if="checkout.config.error.value">{{ t('errors.generic') }}</UiAlert>
              <CheckoutManualMethodPicker
                v-else-if="config"
                v-model="checkout.method.value"
                :methods="config.methods"
                :disabled="checkout.busy.value"
              />
            </CheckoutStep>

            <CheckoutStep :step="3" :title="t('mpay.steps.instructions')" :done="!!checkout.methodConfig.value" :muted="!checkout.methodConfig.value">
              <CheckoutTransferInstructions
                v-if="checkout.methodConfig.value && config"
                :method="checkout.methodConfig.value"
                :amount-minor="order.totalMinor"
                :order-number="order.orderNumber"
                :demo="config.demo"
              />
              <p v-else class="muted hint">{{ t('mpay.pickMethodFirst') }}</p>
            </CheckoutStep>

            <CheckoutStep :step="4" :title="t('mpay.steps.proof')" :done="!!checkout.file.value">
              <CheckoutProofUpload
                :file="checkout.file.value"
                :error="checkout.fileError.value"
                :progress="checkout.progress.value"
                :uploading="checkout.phase.value === 'uploading'"
                :disabled="checkout.busy.value"
                :allow-sample="!!config?.demo"
                :sample-busy="sampleBusy"
                @select="checkout.setFile"
                @sample="useSample"
              />
            </CheckoutStep>

            <CheckoutStep :step="5" :title="t('mpay.steps.submit')">
              <UiAlert v-if="checkout.submitError.value">{{ checkout.submitError.value }}</UiAlert>
              <p class="muted hint">{{ t('mpay.submitNote') }}</p>
              <div class="actions">
                <UiButton
                  size="lg"
                  :loading="checkout.busy.value"
                  :disabled="!checkout.canSubmit.value"
                  @click="submit"
                >
                  {{ checkout.phase.value === 'submitting' ? t('mpay.submitting') : t('mpay.submit') }}
                </UiButton>
              </div>
            </CheckoutStep>
          </template>

          <template v-else>
            <PaymentsPaymentStatusCard v-if="payment?.state" :order="order" :max-attempts="maxAttempts" :show-checkout-link="false" />
            <UiEmptyState v-else :title="t('checkout.notPayableTitle')" :description="t('checkout.notPayableBody')">
              <UiButton variant="secondary" :to="`/account/orders/${order.orderNumber}`">{{ t('checkout.backToOrder') }}</UiButton>
            </UiEmptyState>
          </template>
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
.wrap { max-width: 1120px; margin: 0 auto; padding: clamp(24px, 4vw, 48px) var(--container-pad) 96px; display: flex; flex-direction: column; gap: 20px; }
.back-link { font-size: 13px; }
.title { font-size: clamp(24px, 3vw, 34px); font-weight: 800; margin: 6px 0 0; }
.layout { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
.main-col { flex: 1 1 600px; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.actions { display: flex; justify-content: flex-end; }
.hint { margin: 0; font-size: 14px; }
.skeleton { min-height: 120px; border-radius: 14px; background: var(--neutral-100); display: flex; align-items: center; justify-content: center; color: var(--text-muted); }
</style>
