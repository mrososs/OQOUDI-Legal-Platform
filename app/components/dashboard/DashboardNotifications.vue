<script setup lang="ts">
/** Staff inbox (latest notifications). Payment reviews open the review panel. */
const { t } = useI18n()
const { list, open } = useAccountNotifications('notifications:staff', 6, 'staff')
const items = computed(() => list.data.value ?? [])
</script>

<template>
  <section class="kh-card kh-card--flush box">
    <h2 class="head">{{ t('dashOps.notificationsTitle') }}</h2>
    <div v-if="items.length">
      <AccountNotificationItem v-for="n in items" :key="n.id" :item="n" @open="open" />
    </div>
    <p v-else class="empty muted">{{ t('dashOps.notificationsEmpty') }}</p>
  </section>
</template>

<style scoped>
.head { font-size: 16px; font-weight: 700; margin: 0; padding: 16px 18px; border-bottom: 1px solid var(--border-subtle); }
.empty { margin: 0; padding: 20px 18px; font-size: 14px; }
</style>
