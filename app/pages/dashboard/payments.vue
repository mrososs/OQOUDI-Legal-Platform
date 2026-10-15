<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import type { ManualPaymentConfig } from '#shared/domain/manualPayments'
import type { PillNavItem } from '~/components/ui/UiPillNav.vue'
import { fetchAdminPayments } from '~/repositories/admin'

/** Admin: manual payment verification (default tab) + all payment records. */
definePageMeta({ layout: 'lawyer', middleware: ['auth', 'admin'] })

const { t } = useI18n()
const f = useFormat()
const route = useRoute()
const supabase = useSupabaseClient<Database>()
const requestFetch = useRequestFetch()

const tab = computed<'verify' | 'records'>(() => (route.query.tab === 'records' ? 'records' : 'verify'))
const tabs = computed<PillNavItem[]>(() => [
  { id: 'verify', label: t('admin.mpay.tabs.verify'), to: { path: route.path } },
  { id: 'records', label: t('admin.mpay.tabs.records'), to: { path: route.path, query: { tab: 'records' } } },
])

const mp = useAdminManualPayments()
const { data: config } = await useAsyncData('admin:payment-config', () => requestFetch<ManualPaymentConfig>('/api/payments/manual/config'))
const { data: records } = await useAsyncData('admin:payment-records', () => fetchAdminPayments(supabase), { default: () => [] })

useSeoMeta({ title: () => t('dash.nav.payments'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <div class="top">
      <h1 class="title">{{ t('dash.nav.payments') }}</h1>
      <UiBadge v-if="config?.demo" tone="caution">{{ t('mpay.demo.badge') }}</UiBadge>
    </div>
    <PaymentsPaymentDemoNotice v-if="config?.demo" compact />
    <div class="tabs-scroll"><UiPillNav :items="tabs" :active-id="tab" :aria-label="t('admin.mpay.tabs.label')" /></div>

    <template v-if="tab === 'verify'">
      <AdminPaymentKpis :kpis="mp.kpis.value" :demo="!!config?.demo" @filter="status => mp.setQuery({ status })" />
      <AdminPaymentFilters
        :status="mp.status.value"
        :method="mp.method.value"
        :q="mp.q.value"
        :sort="mp.sortKey.value"
        @change="mp.setQuery"
      />
      <UiAlert v-if="mp.list.error.value">{{ t('errors.generic') }}</UiAlert>
      <AdminManualPaymentsTable :rows="mp.rows.value" :loading="mp.list.status.value === 'pending'" @review="mp.openReview" />
      <nav v-if="mp.pageCount.value > 1" class="pager" :aria-label="t('admin.mpay.pager.label')">
        <UiButton variant="secondary" size="sm" :disabled="mp.page.value <= 1" @click="mp.setQuery({ page: mp.page.value - 1 }, false)">{{ t('admin.mpay.pager.prev') }}</UiButton>
        <span class="muted">{{ t('admin.mpay.pager.of', { page: f.number(mp.page.value), pages: f.number(mp.pageCount.value), total: f.number(mp.total.value) }) }}</span>
        <UiButton variant="secondary" size="sm" :disabled="mp.page.value >= mp.pageCount.value" @click="mp.setQuery({ page: mp.page.value + 1 }, false)">{{ t('admin.mpay.pager.next') }}</UiButton>
      </nav>
    </template>

    <AdminPaymentRecords v-else :payments="records" />

    <AdminPaymentReviewPanel
      :submission="mp.selected.value"
      :loading="!!mp.reviewId.value && mp.detail.status.value === 'pending'"
      :acting="mp.acting.value"
      @close="mp.closeReview"
      @approve="mp.approve"
      @reject="mp.reject"
    />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.title { font-size: 26px; font-weight: 800; margin: 0; }
.tabs-scroll { overflow-x: auto; overflow-y: hidden; }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; font-size: 13px; }
</style>
