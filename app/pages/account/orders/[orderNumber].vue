<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { fetchOrderDetail } from '~/repositories/orders'
import { fetchLawyerName } from '~/repositories/account'
import type { PillNavItem } from '~/components/ui/UiPillNav.vue'

definePageMeta({ layout: 'client', middleware: ['auth'] })

const route = useRoute()
const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const session = useSessionStore()

const orderNumber = computed(() => String(route.params.orderNumber))
// RLS returns nothing for orders of other accounts → same "no access" screen
// as a non-existent order. The account check keeps staff users' assigned
// orders out of their customer portal.
const { data: order, refresh } = await useAsyncData(`account:order:${orderNumber.value}`, async () => {
  const o = await fetchOrderDetail(supabase, orderNumber.value)
  return o && o.customerAccountId === session.account?.id ? o : null
})
const { data: lawyerName } = await useAsyncData(
  `account:order-lawyer:${orderNumber.value}`,
  () => fetchLawyerName(supabase, order.value?.assignedLawyerId ?? null),
  { watch: [() => order.value?.assignedLawyerId] },
)

const actions = useCustomerOrderActions(order, refresh)
const modal = shallowRef<'revise' | 'cancel' | 'rate' | 'reschedule' | null>(null)
const modalOpen = (name: NonNullable<typeof modal.value>) => computed({
  get: () => modal.value === name,
  set: (v: boolean) => { modal.value = v ? name : null },
})
const reviseOpen = modalOpen('revise')
const cancelOpen = modalOpen('cancel')
const rateOpen = modalOpen('rate')
const rescheduleOpen = modalOpen('reschedule')

type Tab = 'documents' | 'messages' | 'details' | 'timeline'
const tab = computed<Tab>(() => {
  const q = route.query.tab
  return q === 'messages' || q === 'details' || q === 'timeline' ? q : 'documents'
})
const basePath = computed(() => `/account/orders/${orderNumber.value}`)
const tabs = computed<PillNavItem[]>(() => [
  { id: 'documents', label: t('account.order.tabs.documents'), to: { path: basePath.value } },
  {
    id: 'messages',
    label: order.value?.messages.length ? t('account.order.tabs.messagesCount', { n: f.number(order.value.messages.length) }) : t('account.order.tabs.messages'),
    to: { path: basePath.value, query: { tab: 'messages' } },
  },
  { id: 'details', label: t('account.order.tabs.details'), to: { path: basePath.value, query: { tab: 'details' } } },
  { id: 'timeline', label: t('account.order.tabs.timeline'), to: { path: basePath.value, query: { tab: 'timeline' } } },
])

async function onAccept() {
  if (await actions.accept()) modal.value = 'rate'
}
async function onRevise(reason: string) {
  if (await actions.requestRevision(reason)) modal.value = null
}
async function onCancel(reason: string) {
  if (await actions.cancel(reason || undefined)) modal.value = null
}
async function onReview(rating: number, comment: string) {
  if (await actions.review(rating, comment)) modal.value = null
}
async function onReschedule(slot: string) {
  if (await actions.reschedule(slot)) modal.value = null
}
async function onMessageSent() {
  await Promise.all([refresh(), refreshPortalBadges()])
}

useSeoMeta({ title: () => (order.value ? `${f.text(order.value.service.title)} · ${order.value.orderNumber}` : t('privacy.title')), robots: 'noindex' })
</script>

<template>
  <SharedAccessDenied v-if="!order" />
  <div v-else class="page">
    <div class="top">
      <NuxtLinkLocale to="/account/orders" class="back">{{ t('account.order.back') }}</NuxtLinkLocale>
      <div class="title-row">
        <div>
          <h1 class="h1">{{ f.text(order.service.title) }}</h1>
          <div class="meta"><span class="ltr">{{ order.orderNumber }}</span> · {{ t('account.order.created', { date: f.date(order.createdAt) }) }}</div>
        </div>
        <div class="badges">
          <OrdersOrderStatusBadge :status="order.status" audience="client" />
          <OrdersPaymentBadge :status="order.paymentStatus" prefix />
        </div>
      </div>
    </div>

    <AccountStatusPanel
      :order="order"
      :busy="actions.busy.value"
      @accept="onAccept"
      @revise="modal = 'revise'"
      @rate="modal = 'rate'"
      @cancel="modal = 'cancel'"
    />

    <div class="layout">
      <div class="main-col">
        <AccountAppointmentCard v-if="order.booking" :order="order" @reschedule="modal = 'reschedule'" />
        <AccountResponseCard v-if="order.responses.length" :order="order" :lawyer-name="lawyerName" />

        <section class="kh-card tabs-card">
          <div class="tabs"><UiPillNav :items="tabs" :active-id="tab" :aria-label="t('account.order.tabsLabel')" /></div>
          <div class="tab-body">
            <AccountDeliveries v-if="tab === 'documents'" :order="order" />
            <OrdersMessageThread
              v-else-if="tab === 'messages'"
              :order-id="order.id"
              :messages="order.messages"
              :documents="order.documents"
              viewer="customer"
              :disabled="order.status === 'cancelled'"
              :hint="order.status === 'awaiting_info' ? t('account.order.messagesHint') : undefined"
              @sent="onMessageSent"
            />
            <AccountOrderDetails v-else-if="tab === 'details'" :order="order" />
            <OrdersOrderTimeline v-else :events="order.events" />
          </div>
        </section>
      </div>
      <AccountOrderSummary :order="order" :lawyer-name="lawyerName" />
    </div>

    <AccountReviseModal v-model:open="reviseOpen" :busy="actions.busy.value === 'revision'" @submit="onRevise" />
    <AccountCancelModal v-model:open="cancelOpen" :busy="actions.busy.value === 'cancel'" @submit="onCancel" />
    <AccountReviewModal v-model:open="rateOpen" :service-title="f.text(order.service.title)" :busy="actions.busy.value === 'review'" @submit="onReview" />
    <AccountRescheduleModal v-model:open="rescheduleOpen" :busy="actions.busy.value === 'reschedule'" @submit="onReschedule" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }
.top { display: flex; flex-direction: column; gap: 8px; }
.back { font-size: 13px; align-self: flex-start; }
.title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.h1 { font-size: clamp(22px, 3vw, 30px); font-weight: 800; margin: 0; }
.meta { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
.badges { display: flex; gap: 6px; flex-wrap: wrap; }
.layout { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
.main-col { flex: 1 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
.tabs-card { display: flex; flex-direction: column; gap: 16px; padding: 0; overflow: hidden; }
.tabs { padding: 14px 16px 0; overflow-x: auto; overflow-y: hidden; }
.tab-body { padding: 0 20px 20px; }
</style>
