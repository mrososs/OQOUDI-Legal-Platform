<script setup lang="ts">
import type { LawyerOption } from '~/repositories/admin'

interface Booking { slot_minutes: number, lead_minutes: number, horizon_days: number, hold_minutes: number }

/** Consultation booking rules + default lawyer for automatic assignment. */
const props = defineProps<{
  booking: Booking | null
  defaultLawyerId: string | null
  lawyers: LawyerOption[]
}>()
const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n()
const { call, toFailure } = useApi()
const toast = useToast()

const form = reactive<Booking>({ slot_minutes: 30, lead_minutes: 120, horizon_days: 60, hold_minutes: 15, ...(props.booking ?? {}) })
const lawyer = shallowRef(props.defaultLawyerId ?? '')
const busy = shallowRef<'booking' | 'lawyer' | null>(null)
const error = shallowRef('')

const lawyerOptions = computed(() => [
  { value: '', label: t('admin.booking.autoAssign') },
  ...props.lawyers.filter(l => l.isActive).map(l => ({ value: l.id, label: l.displayName })),
])

async function saveSetting(key: string, value: unknown, which: 'booking' | 'lawyer') {
  busy.value = which
  error.value = ''
  try {
    await call(`/api/admin/settings/${key}`, { method: 'POST', body: { value } })
    toast.show(t('admin.settings.saved'))
    emit('saved')
  }
  catch (err) {
    error.value = toFailure(err).message
  }
  finally {
    busy.value = null
  }
}

const int = (v: unknown) => Math.trunc(Number(v) || 0)
</script>

<template>
  <div class="stack">
    <UiAlert v-if="error">{{ error }}</UiAlert>
    <form class="kh-card grid" @submit.prevent="saveSetting('booking', { ...form }, 'booking')">
      <h2 class="h full">{{ t('admin.booking.title') }}</h2>
      <UiSelect
        :model-value="String(form.slot_minutes)"
        :label="t('admin.booking.slot')"
        :options="[15, 30, 45, 60].map(m => ({ value: String(m), label: String(m) }))"
        @update:model-value="v => (form.slot_minutes = int(v))"
      />
      <UiInput :model-value="form.lead_minutes" :label="t('admin.booking.lead')" type="number" min="0" @update:model-value="v => (form.lead_minutes = int(v))" />
      <UiInput :model-value="form.horizon_days" :label="t('admin.booking.horizon')" type="number" min="1" @update:model-value="v => (form.horizon_days = int(v))" />
      <UiInput :model-value="form.hold_minutes" :label="t('admin.booking.hold')" type="number" min="5" @update:model-value="v => (form.hold_minutes = int(v))" />
      <div class="full end"><UiButton type="submit" :loading="busy === 'booking'">{{ t('common.save') }}</UiButton></div>
    </form>

    <form class="kh-card grid" @submit.prevent="saveSetting('assignment.default_lawyer', { lawyer_id: lawyer || null }, 'lawyer')">
      <h2 class="h full">{{ t('admin.booking.assignmentTitle') }}</h2>
      <p class="muted small full">{{ t('admin.booking.assignmentLead') }}</p>
      <UiSelect v-model="lawyer" :label="t('admin.booking.defaultLawyer')" :options="lawyerOptions" />
      <div class="full end"><UiButton type="submit" :loading="busy === 'lawyer'">{{ t('common.save') }}</UiButton></div>
    </form>
  </div>
</template>

<style scoped>
.stack { display: flex; flex-direction: column; gap: 16px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 14px; }
.full { grid-column: 1 / -1; }
.h { font-size: 16px; font-weight: 700; margin: 0; }
.small { font-size: 13px; margin: 0; }
.end { display: flex; justify-content: flex-end; }
</style>
