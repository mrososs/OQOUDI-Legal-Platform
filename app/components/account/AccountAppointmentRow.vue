<script setup lang="ts">
import type { OrderListItem } from '~/repositories/orders'

const props = defineProps<{ order: OrderListItem }>()
const { t, locale } = useI18n()
const f = useFormat()

const b = computed(() => props.order.booking!)
const dayNum = computed(() => new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric' }).format(new Date(b.value.startsAt)))
const month = computed(() => new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'ar-EG', { timeZone: 'Africa/Cairo', month: 'short' }).format(new Date(b.value.startsAt)))
const state = computed(() => {
  if (props.order.status === 'cancelled') return { key: 'cancelled', tone: 'critical' as const }
  if (props.order.status === 'completed' || new Date(b.value.endsAt).getTime() < Date.now()) return { key: 'completed', tone: 'neutral' as const }
  if (b.value.status !== 'confirmed') return { key: 'held', tone: 'caution' as const }
  return b.value.meetingUrl ? { key: 'ready', tone: 'positive' as const } : { key: 'pending', tone: 'caution' as const }
})
</script>

<template>
  <NuxtLinkLocale :to="`/account/orders/${order.orderNumber}`" class="kh-card kh-card--interactive row">
    <div class="date" aria-hidden="true"><span class="d">{{ dayNum }}</span><span class="m">{{ month }}</span></div>
    <div class="text">
      <strong>{{ f.day(b.startsAt) }}، {{ f.time(b.startsAt) }}</strong>
      <span class="meta">{{ t('account.appointments.meta') }} · <span class="ltr">{{ order.orderNumber }}</span></span>
    </div>
    <UiBadge :tone="state.tone">{{ t(`account.meeting.state.${state.key}`) }}</UiBadge>
  </NuxtLinkLocale>
</template>

<style scoped>
.row { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; color: inherit; }
.date {
  width: 64px; height: 64px; border-radius: 14px; background: var(--ink-900); color: var(--cream-100);
  display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;
}
.d { font-size: 22px; font-weight: 800; line-height: 1; }
.m { font-size: 11px; }
.text { flex: 1 1 220px; display: flex; flex-direction: column; gap: 2px; }
.text strong { color: var(--text-strong); font-size: 16px; }
.meta { font-size: 13px; color: var(--text-muted); }
</style>
