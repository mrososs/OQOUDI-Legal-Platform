<script setup lang="ts">
import type { CalendarBooking } from '~/repositories/dashboard'

defineProps<{
  bookings: CalendarBooking[]
  names: Record<string, string>
}>()

const { t } = useI18n()
const f = useFormat()
</script>

<template>
  <section class="kh-card kh-card--flush panel">
    <div class="head">
      <h2 class="title">{{ t('dashOps.soonTitle') }}</h2>
      <NuxtLinkLocale to="/dashboard/calendar" class="link">{{ t('dash.nav.calendar') }}</NuxtLinkLocale>
    </div>
    <p v-if="!bookings.length" class="empty">{{ t('dashOps.soonEmpty') }}</p>
    <NuxtLinkLocale
      v-for="b in bookings"
      :key="b.id"
      :to="`/dashboard/requests/${b.orderNumber}`"
      class="row"
    >
      <span class="when">{{ f.day(b.startsAt) }}، {{ f.time(b.startsAt) }}</span>
      <span class="who">{{ names[b.customerAccountId] ?? '—' }}</span>
      <UiBadge :tone="b.meetingUrl ? 'positive' : 'caution'">
        {{ b.meetingUrl ? t('dashOps.linkAdded') : t('dashOps.noLink') }}
      </UiBadge>
    </NuxtLinkLocale>
  </section>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; }
.title { font-size: 16px; font-weight: 700; margin: 0; }
.link { font-size: 14px; }
.empty { margin: 0; padding: 0 18px 18px; color: var(--text-muted); }
.row {
  display: flex; gap: 12px; align-items: center; border-top: 1px solid var(--border-subtle);
  padding: 12px 18px; color: var(--text-body); flex-wrap: wrap;
}
.row:hover { background: var(--neutral-50); }
.when { font-weight: 700; color: var(--text-strong); min-width: 160px; }
.who { flex: 1; }
</style>
