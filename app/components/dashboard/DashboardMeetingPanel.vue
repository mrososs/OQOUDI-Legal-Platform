<script setup lang="ts">
import type { OrderDetail } from '~/repositories/orders'

/** Video consultation: appointment facts, manual Google Meet link, reschedule, complete. */
const props = defineProps<{
  order: OrderDetail
  busy: string | null
}>()

const emit = defineEmits<{
  saveLink: [url: string]
  reschedule: [slotStart: string]
  complete: []
}>()

const MEET_RE = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/

const { t } = useI18n()
const f = useFormat()

const booking = computed(() => props.order.booking)
const confirmed = computed(() => booking.value?.status === 'confirmed')
const hasLink = computed(() => !!booking.value?.meetingUrl)
const closed = computed(() => ['completed', 'cancelled'].includes(props.order.status))
const link = shallowRef(booking.value?.meetingUrl ?? '')
const linkError = shallowRef('')

watch(() => booking.value?.meetingUrl, (v) => {
  link.value = v ?? ''
})

const reschedOpen = shallowRef(false)
const newSlot = shallowRef<string | null>(null)

function save() {
  const v = link.value.trim()
  if (!MEET_RE.test(v)) {
    linkError.value = t('errors.OQ422_MEET_URL')
    return
  }
  linkError.value = ''
  emit('saveLink', v)
}

function confirmReschedule() {
  if (!newSlot.value) return
  emit('reschedule', newSlot.value)
  reschedOpen.value = false
  newSlot.value = null
}
</script>

<template>
  <section class="kh-card panel">
    <div class="head">
      <h2 class="title">{{ t('dashOps.meetingTitle') }}</h2>
      <UiBadge v-if="booking" :tone="booking.meetingUrl ? 'positive' : 'caution'" dot>
        {{ booking.meetingUrl ? t('dashOps.linkPublished') : t('dashOps.linkMissing') }}
      </UiBadge>
    </div>

    <template v-if="booking">
      <dl class="facts">
        <div><dt>{{ t('dashOps.day') }}</dt><dd>{{ f.day(booking.startsAt) }}</dd></div>
        <div><dt>{{ t('dashOps.timeCairo') }}</dt><dd>{{ f.time(booking.startsAt) }} – {{ f.time(booking.endsAt) }}</dd></div>
        <div><dt>{{ t('dashOps.duration') }}</dt><dd>{{ t('dashOps.thirtyMinutes') }}</dd></div>
      </dl>

      <UiAlert v-if="!confirmed && !closed" tone="caution">{{ t('dashOps.bookingNotConfirmed') }}</UiAlert>

      <ol class="steps">
        <li>{{ f.number(1) }}. {{ t('dashOps.meetStep1') }} <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer">Google Meet</a></li>
        <li>{{ f.number(2) }}. {{ t('dashOps.meetStep2') }}</li>
        <li>{{ f.number(3) }}. {{ t('dashOps.meetStep3') }}</li>
      </ol>
      <div class="link-row">
        <div class="link-input">
          <UiInput
            :id="`meet-${order.id}`"
            v-model="link"
            dir="ltr"
            placeholder="https://meet.google.com/abc-defg-hij"
            :error="linkError"
            :disabled="!confirmed || closed"
          />
        </div>
        <UiButton :disabled="!confirmed || closed" :loading="busy === 'meeting-link'" @click="save">
          {{ hasLink ? t('dashOps.updateLink') : t('dashOps.publishLink') }}
        </UiButton>
      </div>
      <p class="muted small no-margin">{{ t('dashOps.manualLinkNote') }}</p>

      <div class="actions">
        <UiButton variant="secondary" size="sm" :disabled="order.status !== 'in_progress'" :loading="busy === 'status'" @click="emit('complete')">
          {{ t('dashOps.markCompleted') }}
        </UiButton>
        <UiButton variant="ghost" size="sm" :disabled="!confirmed || closed" @click="reschedOpen = true">{{ t('dashOps.reschedule') }}</UiButton>
      </div>
    </template>
    <p v-else class="muted no-margin">{{ t('dashOps.noBooking') }}</p>

    <UiModal v-model:open="reschedOpen" :title="t('dashOps.reschedule')">
      <BookingSlotPicker v-model="newSlot" />
      <template #footer>
        <UiButton variant="ghost" @click="reschedOpen = false">{{ t('common.cancel') }}</UiButton>
        <UiButton :disabled="!newSlot" :loading="busy === 'reschedule'" @click="confirmReschedule">{{ t('common.confirm') }}</UiButton>
      </template>
    </UiModal>
  </section>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 14px; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.title { font-size: 17px; font-weight: 700; margin: 0; }
.facts {
  margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;
  background: var(--neutral-100); border-radius: 12px; padding: 14px;
}
.facts dt { font-size: 12px; color: var(--text-muted); }
.facts dd { margin: 0; font-weight: 700; color: var(--text-strong); }
.steps { margin: 0; padding: 0; list-style: none; display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: var(--text-muted); }
.link-row { display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap; }
.link-input { flex: 1 1 300px; }
.small { font-size: 12px; }
.no-margin { margin: 0; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px solid var(--border-subtle); padding-top: 12px; }
</style>
