<script setup lang="ts">
definePageMeta({ layout: 'lawyer', middleware: ['auth', 'staff'] })

const { t } = useI18n()
const f = useFormat()
const { data, status, kpiItems, attention, soon, recent } = useDashboardOverview()

const today = computed(() => f.date(new Date()))

useSeoMeta({ title: () => t('dash.nav.overview'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <div class="top">
      <div>
        <div class="muted">{{ today }}</div>
        <h1 class="title">{{ t('dash.nav.overview') }}</h1>
      </div>
      <UiButton size="sm" to="/dashboard/requests">{{ t('dashOps.allRequests') }}</UiButton>
    </div>

    <UiAlert v-if="status === 'error'">{{ t('errors.generic') }}</UiAlert>

    <DashboardKpiCards :items="kpiItems" />

    <div class="two">
      <DashboardSoonMeetings :bookings="soon" :names="data?.names ?? {}" />
      <DashboardAttentionList :items="attention" />
    </div>

    <section class="kh-card kh-card--flush">
      <h2 class="section-head">{{ t('dashOps.recentTitle') }}</h2>
      <DashboardOrdersTable :orders="recent" :names="data?.names ?? {}" :show-date="false" />
    </section>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }
.top { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.title { font-size: 26px; font-weight: 800; margin: 2px 0 0; }
.two { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 16px; align-items: start; }
.section-head { font-size: 16px; font-weight: 700; margin: 0; padding: 16px 18px; }
</style>
