<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { fetchAccountNames, fetchAvailability, fetchBookings } from '~/repositories/dashboard'

definePageMeta({ layout: 'lawyer', middleware: ['auth', 'staff'] })

const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const route = useRoute()
const router = useRouter()

function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function weekStart(ymd: string) {
  const dow = new Date(`${ymd}T12:00:00Z`).getUTCDay()
  return addDays(ymd, -((dow + 1) % 7)) // Saturday
}

const start = computed(() => {
  const q = route.query.week
  return weekStart(typeof q === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : cairoYmd(new Date()))
})
const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(start.value, i)))

const { data, status } = useAsyncData(
  () => `dashboard:calendar:${start.value}`,
  async () => {
    const from = `${addDays(start.value, -1)}T00:00:00Z`
    const to = `${addDays(start.value, 8)}T00:00:00Z`
    const [bookings, availability] = await Promise.all([
      fetchBookings(supabase, from, to),
      fetchAvailability(supabase, start.value, addDays(start.value, 6)),
    ])
    const inWeek = bookings.filter(b => days.value.includes(cairoYmd(b.startsAt)))
    const names = await fetchAccountNames(supabase, inWeek.map(b => b.customerAccountId))
    return { bookings: inWeek, availability, names }
  },
  { watch: [start] },
)

const missingLinks = computed(() => (data.value?.bookings ?? []).filter(b => b.status === 'confirmed' && !b.meetingUrl && new Date(b.startsAt) > new Date()))
const blockedDays = computed(() => (data.value?.availability.exceptions ?? []))
const weekLabel = computed(() => `${f.shortDate(`${days.value[0]}T12:00:00+02:00`)} – ${f.date(`${days.value[6]}T12:00:00+02:00`)}`)

function go(delta: number) {
  router.replace({ query: { ...route.query, week: addDays(start.value, delta * 7) } })
}

useSeoMeta({ title: () => t('dashOps.cal.title'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <div class="top">
      <h1 class="title">{{ t('dashOps.cal.title') }}</h1>
      <div class="nav">
        <UiIconButton size="sm" :label="t('dashOps.cal.prevWeek')" @click="go(-1)"><span aria-hidden="true">{{ t('common.arrowPrev') }}</span></UiIconButton>
        <strong class="week" aria-live="polite">{{ weekLabel }}</strong>
        <UiIconButton size="sm" :label="t('dashOps.cal.nextWeek')" @click="go(1)"><span aria-hidden="true">{{ t('common.arrowNext') }}</span></UiIconButton>
      </div>
    </div>

    <div class="legend">
      <span><span class="sw sw--ok" />{{ t('dashOps.cal.legendLinked') }}</span>
      <span><span class="sw sw--warn" />{{ t('dashOps.cal.legendNoLink') }}</span>
      <span><span class="sw sw--off" />{{ t('dashOps.cal.legendUnavailable') }}</span>
      <span>{{ t('booking.cairoTime') }}</span>
    </div>

    <UiAlert v-if="status === 'error'">{{ t('errors.generic') }}</UiAlert>
    <DashboardWeekCalendar
      v-if="data"
      :days="days"
      :bookings="data.bookings"
      :availability="data.availability"
      :names="data.names"
    />

    <div class="two">
      <section class="kh-card list">
        <h2 class="list-title">{{ t('dashOps.cal.pendingLinks') }}</h2>
        <span v-if="!missingLinks.length" class="muted">{{ t('dashOps.cal.allLinked') }}</span>
        <div v-for="b in missingLinks" :key="b.id" class="row">
          <div class="grow">
            <strong>{{ data?.names[b.customerAccountId] ?? b.orderNumber }}</strong>
            <div class="muted small">{{ f.day(b.startsAt) }}، {{ f.time(b.startsAt) }}</div>
          </div>
          <UiButton size="sm" :to="`/dashboard/requests/${b.orderNumber}`">{{ t('dashOps.addLink') }}</UiButton>
        </div>
      </section>
      <section class="kh-card list">
        <h2 class="list-title">{{ t('dashOps.cal.blockedTitle') }}</h2>
        <span v-if="!blockedDays.length" class="muted">{{ t('dashOps.cal.noBlocked') }}</span>
        <div v-for="e in blockedDays" :key="e.id" class="row">
          <span class="grow">
            {{ f.day(`${e.date}T12:00:00+02:00`) }}
            <template v-if="e.startTime"> · {{ f.time(`2000-01-01T${e.startTime}:00+02:00`) }} – {{ f.time(`2000-01-01T${e.endTime}:00+02:00`) }}</template>
            <template v-if="e.reason"> · {{ e.reason }}</template>
          </span>
        </div>
        <NuxtLinkLocale v-if="useSessionStore().isAdmin" to="/dashboard/settings?tab=hours" class="small">{{ t('dashOps.cal.manageHours') }}</NuxtLinkLocale>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.title { font-size: 26px; font-weight: 800; margin: 0; }
.nav { display: flex; align-items: center; gap: 8px; }
.week { color: var(--text-strong); min-width: 180px; text-align: center; }
.legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--text-muted); }
.legend > span { display: flex; gap: 6px; align-items: center; }
.sw { width: 12px; height: 12px; border-radius: 3px; }
.sw--ok { background: var(--positive-100); border: 1px solid var(--positive-500); }
.sw--warn { background: var(--caution-100); border: 1px solid var(--caution-500); }
.sw--off { background: var(--neutral-200); }
.two { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap: 16px; align-items: start; }
.list { display: flex; flex-direction: column; gap: 8px; }
.list-title { font-size: 16px; font-weight: 700; margin: 0; }
.row { display: flex; gap: 10px; align-items: center; padding: 8px 0; border-top: 1px solid var(--border-subtle); }
.grow { flex: 1; }
.row strong { color: var(--text-strong); }
.small { font-size: 12px; }
</style>
