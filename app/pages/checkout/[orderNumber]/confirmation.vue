<script setup lang="ts">
import { Check, Clock } from '@lucide/vue'
import type { Database } from '#shared/types/database.types'
import { fetchOrderDetail } from '~/repositories/orders'

/**
 * Post-payment page. It never trusts the return URL: it shows whatever the
 * database says. While the provider webhook is still pending it polls.
 */
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()

const orderNumber = String(route.params.orderNumber)
const paymentId = typeof route.query.payment === 'string' ? route.query.payment : null

const { data: order, refresh } = await useAsyncData(`confirm:${orderNumber}`, () => fetchOrderDetail(supabase, orderNumber))

const attempt = computed(() => (paymentId ? order.value?.payments.find(p => p.id === paymentId) : order.value?.payments[0]) ?? null)
const state = computed<'quote' | 'paid' | 'failed' | 'pending' | 'other'>(() => {
  const o = order.value
  if (!o) return 'other'
  if (o.status === 'new' && o.service.pricingType === 'quote') return 'quote'
  if (o.paymentStatus === 'paid') return 'paid'
  if (attempt.value?.status === 'failed') return 'failed'
  if (attempt.value && ['initiated', 'pending'].includes(attempt.value.status)) return 'pending'
  return 'other'
})

// Poll while the webhook has not been processed yet (max ~60 s).
let timer: ReturnType<typeof setInterval> | null = null
let polls = 0
onMounted(() => {
  if (state.value !== 'pending') return
  timer = setInterval(async () => {
    polls++
    await refresh()
    if (state.value !== 'pending' || polls > 30) {
      if (timer) clearInterval(timer)
    }
  }, 2000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const isMeeting = computed(() => order.value?.service.kind === 'video_consultation')
const meetingLabel = computed(() => {
  const b = order.value?.booking
  return b ? `${f.day(b.startsAt)}، ${f.time(b.startsAt)} – ${f.time(b.endsAt)}` : ''
})
const nextSteps = computed(() => {
  const kind = order.value?.service.kind
  const key = state.value === 'quote' ? 'quote' : kind === 'video_consultation' ? 'meeting' : kind === 'written_consultation' ? 'written' : 'standard'
  return [1, 2, 3].map(n => t(`confirm.next.${key}.${n}`))
})
const title = computed(() => {
  if (state.value === 'quote') return t('confirm.quoteTitle')
  if (state.value === 'paid') return isMeeting.value ? t('confirm.meetingTitle') : t('confirm.paidTitle')
  if (state.value === 'pending') return t('confirm.pendingTitle')
  return t('confirm.failedTitle')
})

useSeoMeta({ title, robots: 'noindex' })
</script>

<template>
  <section class="wrap">
    <SharedAccessDenied v-if="!order" />
    <div v-else class="kh-card kh-card--raised card">
      <div class="badge" :class="`badge--${state}`" aria-hidden="true">
        <Clock v-if="state === 'pending'" :size="28" :stroke-width="2" />
        <Check v-else-if="state !== 'failed'" :size="28" :stroke-width="2.2" />
        <span v-else class="x">!</span>
      </div>

      <div>
        <h1 class="title">{{ title }}</h1>
        <p class="lead" aria-live="polite">
          <template v-if="state === 'quote'">{{ t('confirm.quoteLead') }}</template>
          <template v-else-if="state === 'paid'">{{ t('confirm.paidLead') }}</template>
          <template v-else-if="state === 'pending'">{{ t('confirm.pendingLead') }}</template>
          <template v-else>{{ t('confirm.failedLead', { order: order.orderNumber }) }}</template>
        </p>
      </div>

      <dl class="facts">
        <div><dt>{{ t('confirm.orderNumber') }}</dt><dd class="ltr">{{ order.orderNumber }}</dd></div>
        <div><dt>{{ t('confirm.service') }}</dt><dd>{{ f.text(order.service.title) }}</dd></div>
        <div>
          <dt>{{ state === 'paid' ? t('confirm.amountPaid') : t('confirm.amount') }}</dt>
          <dd>{{ f.money(order.totalMinor) }}</dd>
        </div>
        <div v-if="state === 'paid' && attempt?.receiptNumber"><dt>{{ t('confirm.receipt') }}</dt><dd class="ltr">{{ attempt.receiptNumber }}</dd></div>
      </dl>

      <div v-if="isMeeting && state === 'paid'" class="meeting">
        <strong>{{ meetingLabel }}</strong>
        <span>{{ t('confirm.meetingLinkPending') }}</span>
      </div>

      <div v-if="state !== 'failed' && state !== 'pending'">
        <div class="next-title">{{ t('confirm.whatNext') }}</div>
        <ol class="next">
          <li v-for="(s, i) in nextSteps" :key="i"><span class="num">{{ f.number(i + 1) }}</span>{{ s }}</li>
        </ol>
      </div>

      <div class="actions">
        <UiButton v-if="state === 'failed'" size="lg" :to="`/checkout/${order.orderNumber}`">{{ t('confirm.retry') }}</UiButton>
        <UiButton size="lg" :variant="state === 'failed' ? 'secondary' : 'primary'" :to="`/account/orders/${order.orderNumber}`">{{ t('confirm.trackOrder') }}</UiButton>
        <UiButton variant="ghost" size="lg" to="/services">{{ t('confirm.otherServices') }}</UiButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.wrap { max-width: 720px; margin: 0 auto; padding: clamp(40px, 7vw, 88px) var(--container-pad) 96px; }
.card { display: flex; flex-direction: column; gap: 20px; padding: clamp(24px, 4vw, 40px); }
.badge { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.badge--paid, .badge--quote, .badge--other { background: var(--positive-100); color: var(--positive-500); }
.badge--pending { background: var(--caution-100); color: var(--caution-500); }
.badge--failed { background: var(--critical-100); color: var(--critical-500); }
.x { font-size: 28px; font-weight: 800; }
.title { font-size: clamp(24px, 3vw, 32px); font-weight: 800; margin: 0 0 8px; }
.lead { margin: 0; font-size: 16px; line-height: 1.8; }
.facts {
  margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;
  background: var(--neutral-100); border-radius: 14px; padding: 16px;
}
.facts dt { font-size: 12px; color: var(--text-muted); }
.facts dd { margin: 0; font-weight: 700; color: var(--text-strong); }
.meeting { border: 1px solid var(--gold-200); background: var(--gold-50); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 6px; font-size: 14px; line-height: 1.7; }
.meeting strong { color: var(--text-strong); }
.next-title { font-weight: 700; color: var(--text-strong); margin-bottom: 10px; }
.next { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.next li { display: flex; gap: 12px; font-size: 15px; line-height: 1.7; }
.num {
  width: 24px; height: 24px; border-radius: 50%; background: var(--ink-900); color: var(--cream-100); font-size: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;
}
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
</style>
