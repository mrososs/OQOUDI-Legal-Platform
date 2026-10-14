<script setup lang="ts">
definePageMeta({ layout: 'lawyer', middleware: ['auth', 'staff'] })

const route = useRoute()
const { t } = useI18n()
const session = useSessionStore()

const orderNumber = String(route.params.orderNumber)
const { data, refresh, ready, busy, actions } = useDashboardRequest(orderNumber)
await ready

const order = computed(() => data.value?.order ?? null)
const kind = computed(() => order.value?.service.kind)
const messagesDisabled = computed(() => order.value?.status === 'cancelled')

async function onMessageSent() {
  await refresh()
  await refreshNuxtData('badge:dashboard')
}

useSeoMeta({ title: () => `${t('dash.nav.requests')} · ${orderNumber}`, robots: 'noindex' })
</script>

<template>
  <div v-if="!data || !order" class="denied">
    <SharedAccessDenied back-to="/dashboard/requests" />
  </div>
  <div v-else class="page">
    <DashboardRequestHeader
      :order="order"
      :customer-name="data.extras.customer.accountName"
      :is-admin="session.isAdmin"
      :busy="busy"
      @change-status="actions.changeStatus"
      @request-info="actions.requestInfo"
    />

    <div class="layout">
      <div class="main-col">
        <DashboardMeetingPanel
          v-if="kind === 'video_consultation'"
          :order="order"
          :busy="busy"
          @save-link="actions.saveLink"
          @reschedule="actions.reschedule"
          @complete="actions.complete"
        />
        <DashboardWrittenReply
          v-else-if="kind === 'written_consultation'"
          :order="order"
          :busy="busy"
          @publish="actions.publishResponse"
        />
        <DashboardDeliverablesPanel v-else :order="order" :busy="busy" @deliver="actions.deliver" />

        <section class="kh-card panel">
          <h2 class="title">{{ t('dashOps.messagesTitle') }}</h2>
          <OrdersMessageThread
            :order-id="order.id"
            :messages="order.messages"
            :documents="order.documents"
            viewer="staff"
            :disabled="messagesDisabled"
            @sent="onMessageSent"
          />
        </section>

        <section class="kh-card panel">
          <h2 class="title">{{ t('dashOps.timelineTitle') }}</h2>
          <OrdersOrderTimeline :events="order.events" />
        </section>
      </div>

      <div class="side-col">
        <DashboardAdminActions
          v-if="session.isAdmin"
          :order="order"
          :lawyers="data.lawyers"
          :busy="busy"
          @quote="actions.quote"
          @assign="actions.assign"
          @cancel="actions.cancel"
        />
        <DashboardCustomerCard :customer="data.extras.customer" />
        <DashboardAnswersCard :order="order" :form-version="data.extras.formVersion" />
        <DashboardAttachmentsCard :order="order" />
        <DashboardNotes :notes="data.extras.notes" :busy="busy === 'notes'" @add="actions.addNote" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.layout { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
.main-col { flex: 1 1 580px; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.side-col { flex: 1 1 300px; max-width: 100%; display: flex; flex-direction: column; gap: 16px; }
.panel { display: flex; flex-direction: column; gap: 10px; }
.title { font-size: 17px; font-weight: 700; margin: 0; }
</style>
