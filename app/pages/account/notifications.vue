<script setup lang="ts">
definePageMeta({ layout: 'client', middleware: ['auth'] })

const { t } = useI18n()
const { list, open, markAll } = useAccountNotifications('notifications:list', 100)
const hasUnread = computed(() => list.data.value.some(n => !n.readAt))
const busy = shallowRef(false)

async function onMarkAll() {
  busy.value = true
  await markAll()
  busy.value = false
}

useSeoMeta({ title: () => t('portal.nav.notifications'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <div class="head">
      <h1 class="h1">{{ t('portal.nav.notifications') }}</h1>
      <UiButton v-if="hasUnread" variant="ghost" size="sm" :loading="busy" @click="onMarkAll">{{ t('account.notifications.markAll') }}</UiButton>
    </div>
    <div v-if="list.data.value.length" class="kh-card list">
      <AccountNotificationItem v-for="n in list.data.value" :key="n.id" :item="n" @open="open" />
    </div>
    <UiEmptyState v-else :title="t('account.notifications.empty')" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; max-width: 820px; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.h1 { font-size: clamp(24px, 3vw, 32px); font-weight: 800; margin: 0; }
.list { padding: 0; overflow: hidden; }
</style>
