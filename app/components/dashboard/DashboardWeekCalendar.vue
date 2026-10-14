<script setup lang="ts">
import type { AvailabilityData, CalendarBooking } from '~/repositories/dashboard'

/**
 * Weekly consultation grid (Saturday → Friday, Cairo wall-clock).
 * Cells: booked (link / no link), blocked, off-hours, free.
 */
const props = defineProps<{
  days: string[] // 7 × YYYY-MM-DD (Cairo)
  bookings: CalendarBooking[]
  availability: AvailabilityData
  names: Record<string, string>
  slotMinutes?: number
}>()

const { t } = useI18n()
const f = useFormat()
const localePath = useLocalePath()

const step = computed(() => props.slotMinutes ?? 30)

function toMin(hm: string) {
  const [h, m] = hm.split(':').map(Number) as [number, number]
  return h * 60 + m
}
function toHm(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}
function cairoHm(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: CAIRO_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
}
function weekday(ymd: string) {
  return new Date(`${ymd}T12:00:00Z`).getUTCDay()
}

const rows = computed(() => {
  const rules = props.availability.rules
  if (!rules.length) return [] as string[]
  const start = Math.min(...rules.map(r => toMin(r.startTime)))
  const end = Math.max(...rules.map(r => toMin(r.endTime)))
  const out: string[] = []
  for (let m = start; m < end; m += step.value) out.push(toHm(m))
  return out
})

const bookingAt = computed(() => {
  const map = new Map<string, CalendarBooking>()
  for (const b of props.bookings) map.set(`${cairoYmd(b.startsAt)} ${cairoHm(b.startsAt)}`, b)
  return map
})

const header = computed(() => props.days.map((ymd) => {
  const dayOff = props.availability.exceptions.find(e => e.date === ymd && !e.startTime)
  const hasRule = props.availability.rules.some(r => r.weekday === weekday(ymd))
  return {
    ymd,
    name: f.text({ ar: new Intl.DateTimeFormat('ar-EG', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${ymd}T12:00:00Z`)), en: new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${ymd}T12:00:00Z`)) }),
    date: f.shortDate(`${ymd}T12:00:00+02:00`),
    off: !!dayOff || !hasRule,
    offLabel: dayOff ? t('dashOps.cal.blockedDay') : !hasRule ? t('dashOps.cal.dayOff') : '',
    today: ymd === cairoYmd(new Date()),
  }
}))

type Cell = { key: string, kind: 'booked' | 'blocked' | 'off' | 'free', booking?: CalendarBooking, label: string }

const grid = computed(() => rows.value.map(hm => ({
  hm,
  cells: props.days.map((ymd): Cell => {
    const key = `${ymd} ${hm}`
    const booking = bookingAt.value.get(key)
    if (booking) {
      return { key, kind: 'booked', booking, label: props.names[booking.customerAccountId] ?? booking.orderNumber }
    }
    const min = toMin(hm)
    const blocked = props.availability.exceptions.some(e => e.date === ymd && (!e.startTime || (min >= toMin(e.startTime) && min < toMin(e.endTime!))))
    if (blocked) return { key, kind: 'blocked', label: t('dashOps.cal.blocked') }
    const rule = props.availability.rules.find(r => r.weekday === weekday(ymd) && min >= toMin(r.startTime) && min < toMin(r.endTime))
    return { key, kind: rule ? 'free' : 'off', label: '' }
  }),
})))

function open(b: CalendarBooking) {
  navigateTo(localePath(`/dashboard/requests/${b.orderNumber}`))
}
</script>

<template>
  <div class="kh-card kh-card--flush scroll">
    <div class="grid" role="grid" :aria-label="t('dashOps.cal.title')">
      <div class="corner" />
      <div v-for="d in header" :key="d.ymd" class="head" :class="{ today: d.today, off: d.off }" role="columnheader">
        <div class="day-name">{{ d.name }}</div>
        <div class="day-date">{{ d.date }}</div>
        <div v-if="d.offLabel" class="off-label">{{ d.offLabel }}</div>
      </div>
      <template v-for="r in grid" :key="r.hm">
        <div class="time">{{ f.time(`2000-01-01T${r.hm}:00+02:00`) }}</div>
        <div v-for="c in r.cells" :key="c.key" class="cell" :class="`cell--${c.kind}`">
          <button
            v-if="c.booking"
            type="button"
            class="booking"
            :class="c.booking.meetingUrl ? 'booking--ok' : 'booking--warn'"
            :aria-label="`${c.label} — ${c.booking.meetingUrl ? t('dashOps.linkAdded') : t('dashOps.noLink')}`"
            @click="open(c.booking)"
          >
            <span class="who">{{ c.label }}</span>
            <span class="state">{{ c.booking.status === 'held' ? t('dashOps.cal.held') : c.booking.meetingUrl ? t('dashOps.linkAdded') : t('dashOps.noLink') }}</span>
          </button>
          <span v-else-if="c.kind === 'blocked'" class="blocked">{{ c.label }}</span>
        </div>
      </template>
    </div>
    <p v-if="!grid.length" class="empty">{{ t('dashOps.cal.noHours') }}</p>
  </div>
</template>

<style scoped>
.scroll { overflow-x: auto; overflow-y: hidden; }
.grid { display: grid; grid-template-columns: 64px repeat(7, minmax(110px, 1fr)); min-width: 860px; }
.corner { border-bottom: 1px solid var(--border-subtle); }
.head { padding: 10px 8px; border-bottom: 1px solid var(--border-subtle); border-inline-start: 1px solid var(--border-subtle); text-align: center; }
.head.today { background: var(--gold-50); }
.head.off { background: var(--neutral-100); }
.day-name { font-weight: 700; color: var(--text-strong); }
.day-date { font-size: 12px; color: var(--text-muted); }
.off-label { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.time { padding: 6px; font-size: 11px; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); text-align: center; }
.cell { height: 46px; border-bottom: 1px solid var(--border-subtle); border-inline-start: 1px solid var(--border-subtle); padding: 3px; background: #fff; }
.cell--off, .cell--blocked { background: var(--neutral-200); }
.booking {
  width: 100%; height: 100%; border-radius: 6px; padding: 2px 6px; display: flex; flex-direction: column;
  justify-content: center; overflow: hidden; cursor: pointer; text-align: start;
}
.booking--ok { border: 1px solid var(--positive-500); background: var(--positive-100); }
.booking--warn { border: 1px solid var(--caution-500); background: var(--caution-100); }
.who { font-size: 12px; font-weight: 600; color: var(--text-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.state { font-size: 10px; color: var(--text-muted); }
.blocked { font-size: 11px; color: var(--text-muted); padding: 0 6px; }
.empty { padding: 24px; margin: 0; text-align: center; color: var(--text-muted); }
</style>
