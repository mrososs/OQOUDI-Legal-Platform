<script setup lang="ts">
import { Check, Clock, XCircle } from '@lucide/vue'
import type { Database } from '#shared/types/database.types'
import { manualPaymentState } from '#shared/domain/manualPayments'
import { fetchOrderDetail } from '~/repositories/orders'

/**
 * Payment verification status screen (after a proof submission) and the
 * "quote request sent" screen. It shows whatever the database says.
 */
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const session = useSessionStore()

const orderNumber = String(route.params.orderNumber)
const { data: order, refresh } = await useAsyncData(`confirm:${orderNumber}`, async () => {
  const o = await fetchOrderDetail(supabase, orderNumber)
  return o && o.customerAccountId === session.account?.id ? o : null
})

const payment = computed(() => (order.value ? manualPaymentState(order.value, 3) : null))
const state = computed<'quote' | 'pending' | 'approved' | 'rejected' | 'awaiting' | 'other'>(() => {
  const o = order.value
  if (!o) return 'other'
  if (o.status === 'new' && o.service.pricingType === 'quote') return 'quote'
  return payment.value?.state ?? 'other'
})

// The admin decision arrives as a notification; refresh when the tab regains focus.
function onVisible() {
  if (document.visibilityState === 'visible' && state.value === 'pending') refresh()
}
onMounted(() => document.addEventListener('visibilitychange', onVisible))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

const nextSteps = computed(() => {
  const kind = order.value?.service.kind
  const key = state.value === 'quote' ? 'quote' : state.value === 'pending' ? 'review' : kind === 'video_consultation' ? 'meeting' : kind === 'written_consultation' ? 'written' : 'standard'
  return [1, 2, 3].map(n => t(`confirm.next.${key}.${n}`))
})
const title = computed(() => (state.value === 'quote' ? t('confirm.quoteTitle') : t(`mpay.status.${state.value === 'other' ? 'awaiting' : state.value}.title`)))

useSeoMeta({ title, robots: 'noindex' })
</script>

<template>
  <section class="wrap">
    <SharedAccessDenied v-if="!order" />
    <div v-else class="col">
      <div v-if="state === 'quote'" class="kh-card kh-card--raised card">
        <div class="badge badge--ok" aria-hidden="true"><Check :size="28" :stroke-width="2.2" /></div>
        <div>
          <h1 class="title">{{ title }}</h1>
          <p class="lead">{{ t('confirm.quoteLead') }}</p>
        </div>
        <dl class="facts">
          <div><dt>{{ t('confirm.orderNumber') }}</dt><dd class="ltr">{{ order.orderNumber }}</dd></div>
          <div><dt>{{ t('confirm.service') }}</dt><dd>{{ f.text(order.service.title) }}</dd></div>
        </dl>
      </div>

      <template v-else>
        <div class="kh-card kh-card--raised card">
          <div class="badge" :class="`badge--${state}`" aria-hidden="true">
            <Clock v-if="state === 'pending' || state === 'awaiting'" :size="28" :stroke-width="2" />
            <XCircle v-else-if="state === 'rejected'" :size="28" :stroke-width="2" />
            <Check v-else :size="28" :stroke-width="2.2" />
          </div>
          <div>
            <h1 class="title">{{ title }}</h1>
            <p v-if="state === 'pending'" class="lead" aria-live="polite">{{ t('mpay.submitted') }}</p>
          </div>
        </div>
        <PaymentsPaymentStatusCard :order="order" />
      </template>

      <div v-if="state !== 'rejected' && state !== 'awaiting'" class="kh-card card">
        <div class="next-title">{{ t('confirm.whatNext') }}</div>
        <ol class="next">
          <li v-for="(s, i) in nextSteps" :key="i"><span class="num">{{ f.number(i + 1) }}</span>{{ s }}</li>
        </ol>
      </div>

      <div class="actions">
        <UiButton size="lg" :to="`/account/orders/${order.orderNumber}`">{{ t('confirm.trackOrder') }}</UiButton>
        <UiButton variant="ghost" size="lg" to="/services">{{ t('confirm.otherServices') }}</UiButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.wrap { max-width: 760px; margin: 0 auto; padding: clamp(40px, 7vw, 88px) var(--container-pad) 96px; }
.col { display: flex; flex-direction: column; gap: 16px; }
.card { display: flex; flex-direction: column; gap: 16px; padding: clamp(20px, 4vw, 32px); }
.badge { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.badge--ok, .badge--approved, .badge--other { background: var(--positive-100); color: var(--positive-500); }
.badge--pending, .badge--awaiting { background: var(--caution-100); color: var(--caution-500); }
.badge--rejected { background: var(--critical-100); color: var(--critical-500); }
.title { font-size: clamp(22px, 3vw, 30px); font-weight: 800; margin: 0 0 8px; }
.lead { margin: 0; font-size: 16px; line-height: 1.8; }
.facts {
  margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;
  background: var(--neutral-100); border-radius: 14px; padding: 16px;
}
.facts dt { font-size: 12px; color: var(--text-muted); }
.facts dd { margin: 0; font-weight: 700; color: var(--text-strong); }
.next-title { font-weight: 700; color: var(--text-strong); }
.next { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.next li { display: flex; gap: 12px; font-size: 15px; line-height: 1.7; }
.num {
  width: 24px; height: 24px; border-radius: 50%; background: var(--ink-900); color: var(--cream-100); font-size: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;
}
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
</style>
