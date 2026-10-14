<script setup lang="ts">
import type { PillNavItem } from '~/components/ui/UiPillNav.vue'

definePageMeta({ layout: 'client', middleware: ['auth'] })

const { t } = useI18n()
const route = useRoute()
const { data: orders, status } = await useCustomerOrders()

type Tab = 'active' | 'completed' | 'all'
const tab = computed<Tab>(() => (route.query.tab === 'completed' || route.query.tab === 'all' ? route.query.tab : 'active'))

const tabs = computed<PillNavItem[]>(() => (['active', 'completed', 'all'] as const).map(id => ({
  id,
  label: t(`account.orders.tabs.${id}`),
  to: { path: '/account/orders', query: id === 'active' ? {} : { tab: id } },
})))

const list = computed(() => {
  if (tab.value === 'active') return orders.value.filter(o => !['completed', 'cancelled'].includes(o.status))
  if (tab.value === 'completed') return orders.value.filter(o => o.status === 'completed')
  return orders.value
})

useSeoMeta({ title: () => t('account.orders.title'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <h1 class="h1">{{ t('account.orders.title') }}</h1>
    <div class="tabs"><UiPillNav :items="tabs" :active-id="tab" :aria-label="t('account.orders.tabsLabel')" /></div>
    <div v-if="status === 'pending'" class="list">
      <UiSkeletonCard v-for="n in 3" :key="n" :height="96" />
    </div>
    <div v-else-if="list.length" class="list">
      <AccountOrderCard v-for="o in list" :key="o.id" :order="o" />
    </div>
    <UiEmptyState v-else :title="t('account.orders.emptyTitle')" :description="t('account.orders.emptyText')">
      <UiButton to="/services">{{ t('account.orders.browse') }}</UiButton>
    </UiEmptyState>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }
.h1 { font-size: clamp(24px, 3vw, 32px); font-weight: 800; margin: 0; }
.tabs { overflow-x: auto; overflow-y: hidden; }
.list { display: flex; flex-direction: column; gap: 10px; }
</style>
