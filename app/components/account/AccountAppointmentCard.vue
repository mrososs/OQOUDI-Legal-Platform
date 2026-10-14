<script setup lang="ts">
import { Clock, Video } from '@lucide/vue'
import type { OrderDetail } from '~/repositories/orders'

/** Video consultation appointment: date/time (Cairo), Meet link state, reschedule. */
const props = defineProps<{ order: OrderDetail }>()
const emit = defineEmits<{ reschedule: [] }>()

const { t } = useI18n()
const f = useFormat()
const toast = useToast()

const b = computed(() => props.order.booking!)
const ended = computed(() => ['completed', 'cancelled'].includes(props.order.status))
const state = computed(() => {
  if (props.order.status === 'cancelled') return { key: 'cancelled', tone: 'critical' as const }
  if (props.order.status === 'completed') return { key: 'completed', tone: 'neutral' as const }
  if (b.value.status !== 'confirmed') return { key: 'held', tone: 'caution' as const }
  return b.value.meetingUrl ? { key: 'ready', tone: 'positive' as const } : { key: 'pending', tone: 'caution' as const }
})
// Rescheduling: confirmed bookings only, ≥ 24 h before (also enforced in SQL).
const canReschedule = computed(() => b.value.status === 'confirmed' && !ended.value
  && new Date(b.value.startsAt).getTime() - Date.now() > 24 * 3600 * 1000)
const tooLate = computed(() => b.value.status === 'confirmed' && !ended.value && !canReschedule.value)

async function copy() {
  try {
    await navigator.clipboard.writeText(b.value.meetingUrl ?? '')
    toast.show(t('account.meeting.copied'))
  }
  catch {
    // Clipboard API unavailable (insecure context / permissions) — the link stays visible to copy manually.
  }
}
</script>

<template>
  <section class="kh-card card">
    <div class="head">
      <h2 class="title">{{ t('account.meeting.title') }}</h2>
      <UiBadge :tone="state.tone">{{ t(`account.meeting.state.${state.key}`) }}</UiBadge>
    </div>
    <div class="facts">
      <div><div class="k">{{ t('account.meeting.date') }}</div><div class="v">{{ f.day(b.startsAt) }}</div></div>
      <div><div class="k">{{ t('account.meeting.time') }}</div><div class="v">{{ f.time(b.startsAt) }} – {{ f.time(b.endsAt) }}</div></div>
      <div><div class="k">{{ t('account.meeting.duration') }}</div><div class="v">{{ t('account.meeting.exact') }}</div></div>
    </div>
    <div v-if="b.meetingUrl && !ended" class="link ok">
      <Video :size="22" :stroke-width="1.8" class="ic-ok" aria-hidden="true" />
      <div class="link-text">
        <div class="v">{{ t('account.meeting.linkReady') }}</div>
        <div class="url ltr">{{ b.meetingUrl }}</div>
      </div>
      <UiButton size="sm" :href="b.meetingUrl" target="_blank" rel="noopener noreferrer">{{ t('account.meeting.join') }}</UiButton>
      <UiButton variant="ghost" size="sm" @click="copy">{{ t('account.meeting.copy') }}</UiButton>
    </div>
    <div v-else-if="!ended && b.status === 'confirmed'" class="link wait">
      <Clock :size="22" :stroke-width="1.8" class="ic-wait" aria-hidden="true" />
      <div>
        <div class="v">{{ t('account.meeting.pendingTitle') }}</div>
        <div class="small">{{ t('account.meeting.pendingText') }}</div>
      </div>
    </div>
    <div v-if="canReschedule || tooLate" class="actions">
      <UiButton v-if="canReschedule" variant="secondary" size="sm" @click="emit('reschedule')">{{ t('account.meeting.reschedule') }}</UiButton>
      <span class="small muted">{{ canReschedule ? t('account.meeting.rescheduleNote') : t('account.meeting.tooLate') }}</span>
    </div>
  </section>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 14px; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.title { font-size: 18px; font-weight: 700; margin: 0; }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.k { font-size: 12px; color: var(--text-muted); }
.v { font-weight: 700; color: var(--text-strong); }
.link { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; border-radius: 12px; padding: 14px 16px; }
.ok { background: var(--positive-100); }
.wait { background: var(--caution-100); }
.ic-ok { color: var(--positive-500); flex-shrink: 0; }
.ic-wait { color: var(--caution-500); flex-shrink: 0; }
.link-text { flex: 1 1 200px; min-width: 0; }
.url { font-size: 13px; overflow-wrap: anywhere; }
.small { font-size: 13px; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
</style>
