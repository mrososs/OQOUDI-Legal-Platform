<script setup lang="ts">
import type { AvailabilityRule } from '~/repositories/admin'

/**
 * Weekly working hours of the consultation calendar (Africa/Cairo).
 * Rows run Saturday → Friday; weekday values follow Postgres extract(dow)
 * (Sunday = 0 … Saturday = 6).
 */
const props = defineProps<{ rules: AvailabilityRule[], slotMinutes: number }>()
const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n()
const f = useFormat()
const { call, toFailure } = useApi()
const toast = useToast()

const DAYS = [6, 0, 1, 2, 3, 4, 5] as const

interface Row { weekday: number, on: boolean, from: string, to: string }
const rows = ref<Row[]>(DAYS.map((d) => {
  const r = props.rules.find(x => x.weekday === d)
  return { weekday: d, on: !!r, from: r?.startTime ?? '10:00', to: r?.endTime ?? '16:00' }
}))

const times = computed(() => {
  const out: { value: string, label: string }[] = []
  for (let m = 6 * 60; m <= 23 * 60; m += 30) {
    const hm = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    out.push({ value: hm, label: f.time(`2026-01-01T${hm}:00+02:00`) })
  }
  return out
})

function slotCount(r: Row) {
  const [fh, fm] = r.from.split(':').map(Number) as [number, number]
  const [th, tm] = r.to.split(':').map(Number) as [number, number]
  return Math.max(0, Math.floor(((th * 60 + tm) - (fh * 60 + fm)) / props.slotMinutes))
}

const invalid = computed(() => rows.value.some(r => r.on && r.to <= r.from))
const busy = shallowRef(false)
const error = shallowRef('')

function update(i: number, patch: Partial<Row>) {
  rows.value = rows.value.map((r, j) => (j === i ? { ...r, ...patch } : r))
}

async function save() {
  if (invalid.value) return
  busy.value = true
  error.value = ''
  try {
    await call('/api/admin/availability/rules', {
      method: 'POST',
      body: { rules: rows.value.filter(r => r.on).map(r => ({ weekday: r.weekday, startTime: r.from, endTime: r.to })) },
    })
    toast.success(t('admin.settings.saved'))
    emit('saved')
  }
  catch (err) {
    error.value = toFailure(err).message
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="kh-card wrap">
    <h2 class="h">{{ t('admin.hours.title') }}</h2>
    <span class="muted small">{{ t('admin.hours.lead', { n: f.number(slotMinutes) }) }}</span>
    <UiAlert v-if="error">{{ error }}</UiAlert>
    <div v-for="(r, i) in rows" :key="r.weekday" class="row">
      <AdminSwitch :model-value="r.on" :aria-label="t(`admin.days.d${r.weekday}`)" @update:model-value="v => update(i, { on: v })" />
      <strong class="day">{{ t(`admin.days.d${r.weekday}`) }}</strong>
      <div v-if="r.on" class="times">
        <select class="kh-input sel" :value="r.from" :aria-label="t('admin.hours.from')" @change="update(i, { from: ($event.target as HTMLSelectElement).value })">
          <option v-for="o in times" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <span>{{ t('admin.hours.to') }}</span>
        <select class="kh-input sel" :value="r.to" :aria-label="t('admin.hours.to')" @change="update(i, { to: ($event.target as HTMLSelectElement).value })">
          <option v-for="o in times" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <span v-if="r.to > r.from" class="muted small">{{ t('admin.hours.slots', { n: f.number(slotCount(r)) }) }}</span>
        <span v-else class="err small">{{ t('admin.issues.time_range') }}</span>
      </div>
      <span v-else class="muted">{{ t('admin.hours.off') }}</span>
    </div>
    <div class="end"><UiButton :loading="busy" :disabled="invalid" @click="save">{{ t('common.save') }}</UiButton></div>
  </section>
</template>

<style scoped>
.wrap { display: flex; flex-direction: column; gap: 4px; }
.h { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
.small { font-size: 13px; }
.row { display: flex; gap: 12px; align-items: center; padding: 8px 0; border-top: 1px solid var(--border-subtle); flex-wrap: wrap; }
.day { width: 90px; color: var(--text-strong); }
.times { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.sel { width: 120px; padding-block: 6px; padding-inline-start: 10px; }
.err { color: var(--critical-500); }
.end { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
