<script setup lang="ts">
import type { Database } from '#shared/types/database.types'

/**
 * Month calendar of 30-minute consultation slots. Availability comes from
 * the database (`available_slots`), all times shown in Africa/Cairo.
 * v-model = selected slot start (ISO, UTC).
 */
const selected = defineModel<string | null>({ default: null })

const props = withDefaults(defineProps<{ monthsAhead?: number }>(), { monthsAhead: 2 })

const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()

interface Slot { start: string, end: string, available: boolean }

const todayYmd = cairoYmd(new Date())
const [ty, tm] = todayYmd.split('-').map(Number) as [number, number]
const monthOffset = shallowRef(0)
const selectedDay = shallowRef<string | null>(selected.value ? cairoYmd(selected.value) : null)

const view = computed(() => {
  const total = tm - 1 + monthOffset.value
  const year = ty + Math.floor(total / 12)
  const month = (total % 12) + 1
  return { year, month }
})

const range = computed(() => {
  const { year, month } = view.value
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const mm = String(month).padStart(2, '0')
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(days).padStart(2, '0')}`, days }
})

const { data: slots, status } = useAsyncData(
  () => `slots:${range.value.from}`,
  async () => {
    const { data, error } = await supabase.rpc('available_slots', { p_from: range.value.from, p_to: range.value.to })
    if (error) throw error
    return (data ?? []).map(s => ({ start: s.slot_start, end: s.slot_end, available: s.is_available })) as Slot[]
  },
  { default: () => [] as Slot[], server: false, watch: [range] },
)

const byDay = computed(() => {
  const map = new Map<string, Slot[]>()
  for (const s of slots.value) {
    const day = cairoYmd(s.start)
    map.set(day, [...(map.get(day) ?? []), s])
  }
  return map
})

const monthLabel = computed(() =>
  new Intl.DateTimeFormat(f.text({ ar: 'ar-EG', en: 'en-GB' }), { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(view.value.year, view.value.month - 1, 1))),
)

const cells = computed(() => {
  const { year, month } = view.value
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay() // 0 = Sunday
  const offset = (firstDow + 1) % 7 // week starts Saturday
  const out: { key: string, ymd: string | null, label: string, available: boolean }[] = []
  for (let i = 0; i < offset; i++) out.push({ key: `pad-${i}`, ymd: null, label: '', available: false })
  for (let d = 1; d <= range.value.days; d++) {
    const ymd = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    out.push({ key: ymd, ymd, label: f.number(d), available: (byDay.value.get(ymd) ?? []).some(s => s.available) })
  }
  return out
})

const daySlots = computed(() => (selectedDay.value ? byDay.value.get(selectedDay.value) ?? [] : []))
const weekdays = computed(() => [0, 1, 2, 3, 4, 5, 6].map(i => t(`calendar.wd${i}`)))

function pickDay(ymd: string) {
  selectedDay.value = ymd
  if (selected.value && cairoYmd(selected.value) !== ymd) selected.value = null
}
</script>

<template>
  <div class="kh-card picker">
    <div class="head">
      <h2 class="title">{{ t('booking.pickDay') }}</h2>
      <div class="nav">
        <UiIconButton size="sm" :label="t('booking.prevMonth')" :disabled="monthOffset <= 0" @click="monthOffset--">
          <span aria-hidden="true">{{ t('common.arrowPrev') }}</span>
        </UiIconButton>
        <span class="month" aria-live="polite">{{ monthLabel }}</span>
        <UiIconButton size="sm" :label="t('booking.nextMonth')" :disabled="monthOffset >= props.monthsAhead" @click="monthOffset++">
          <span aria-hidden="true">{{ t('common.arrowNext') }}</span>
        </UiIconButton>
      </div>
    </div>

    <div class="grid" role="grid" :aria-busy="status === 'pending'">
      <div v-for="w in weekdays" :key="w" class="wd" role="columnheader">{{ w }}</div>
      <template v-for="c in cells" :key="c.key">
        <span v-if="!c.ymd" class="pad" />
        <button
          v-else
          type="button"
          class="day"
          :class="{ 'day--on': selectedDay === c.ymd, 'day--avail': c.available }"
          :disabled="!c.available"
          :aria-pressed="selectedDay === c.ymd"
          :aria-label="`${f.day(`${c.ymd}T12:00:00+02:00`)}${c.available ? '' : ` — ${t('booking.unavailable')}`}`"
          @click="pickDay(c.ymd)"
        >
          {{ c.label }}<span class="dot" />
        </button>
      </template>
    </div>

    <div class="legend">
      <span><span class="lg lg--gold" />{{ t('booking.legendAvailable') }}</span>
      <span><span class="lg" />{{ t('booking.legendUnavailable') }}</span>
      <span>{{ t('booking.cairoTime') }}</span>
    </div>

    <div v-if="selectedDay" class="slots-wrap">
      <div class="slots-head">
        <h3 class="day-title">{{ f.day(`${selectedDay}T12:00:00+02:00`) }}</h3>
        <span class="muted small">{{ t('booking.exact30') }}</span>
      </div>
      <div v-if="daySlots.some(s => s.available)" class="slots">
        <button
          v-for="s in daySlots"
          :key="s.start"
          type="button"
          class="slot"
          :aria-pressed="selected === s.start"
          :disabled="!s.available"
          @click="selected = s.start"
        >
          {{ f.time(s.start) }}
          <span class="until">{{ t('booking.until', { time: f.time(s.end) }) }}</span>
        </button>
      </div>
      <div v-else class="none">{{ t('booking.noSlots') }}</div>
    </div>
  </div>
</template>

<style scoped>
.picker { display: flex; flex-direction: column; gap: 20px; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.title { font-size: 20px; font-weight: 700; margin: 0; }
.nav { display: flex; align-items: center; gap: 8px; }
.month { font-weight: 600; color: var(--text-strong); min-width: 120px; text-align: center; }
.grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.wd { text-align: center; font-size: 12px; color: var(--text-muted); padding: 4px 0; }
.day {
  height: 52px; border-radius: 10px; border: 1.5px solid transparent; background: var(--neutral-100);
  color: var(--text-subtle); font-size: 15px; font-weight: 500; cursor: not-allowed;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
}
.day--avail { border-color: var(--gold-200); background: #fff; color: var(--text-strong); cursor: pointer; }
.day--on { border-color: var(--ink-900); background: var(--ink-900); color: var(--cream-100); font-weight: 700; }
.dot { width: 4px; height: 4px; border-radius: 50%; background: transparent; }
.day--avail .dot { background: var(--gold-500); }
.day--on .dot { background: var(--cream-100); }
.legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--text-muted); }
.legend > span { display: flex; gap: 6px; align-items: center; }
.lg { width: 8px; height: 8px; border-radius: 50%; background: var(--neutral-300); }
.lg--gold { background: var(--gold-500); }
.slots-wrap { border-top: 1px solid var(--border-subtle); padding-top: 18px; display: flex; flex-direction: column; gap: 12px; }
.slots-head { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.day-title { font-size: 17px; font-weight: 700; margin: 0; }
.small { font-size: 13px; }
.slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.slot {
  padding: 12px 8px; border-radius: 10px; border: 1.5px solid var(--border-default); background: #fff;
  color: var(--text-strong); font-size: 14px; font-weight: 600; cursor: pointer;
}
.slot:disabled { border-color: transparent; background: var(--neutral-100); color: var(--text-subtle); cursor: not-allowed; text-decoration: line-through; }
.slot[aria-pressed='true'] { border-color: var(--ink-900); background: var(--ink-900); color: var(--cream-100); }
.until { display: block; font-size: 11px; font-weight: 400; opacity: 0.8; }
.none { background: var(--neutral-100); border-radius: 10px; padding: 16px; font-size: 14px; }
</style>
