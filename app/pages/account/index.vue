<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { fetchLawyerName } from '~/repositories/account'

definePageMeta({ layout: 'client', middleware: ['auth'] })

const { t, locale } = useI18n()
const session = useSessionStore()
const supabase = useSupabaseClient<Database>()

const { data: orders } = await useCustomerOrders()
const { list: recent, open } = useAccountNotifications('notifications:recent', 4)

const active = computed(() => orders.value.filter(o => !['completed', 'cancelled'].includes(o.status)))
const nextMeeting = computed(() => {
  const now = Date.now()
  return orders.value
    .filter(o => o.booking?.status === 'confirmed' && new Date(o.booking.endsAt).getTime() > now)
    .sort((a, b) => a.booking!.startsAt.localeCompare(b.booking!.startsAt))[0] ?? null
})
const { data: lawyerName } = await useAsyncData(
  'account:next-meeting-lawyer',
  () => fetchLawyerName(supabase, nextMeeting.value?.assignedLawyerId ?? null),
  { watch: [nextMeeting] },
)

const today = computed(() => new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'ar-EG', {
  timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date()))

useSeoMeta({ title: () => t('portal.nav.overview'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <div>
      <div class="today">{{ today }}</div>
      <h1 class="h1">{{ t('account.greeting', { name: session.firstName }) }}</h1>
    </div>

    <AccountActionList :orders="orders" />

    <div class="grid">
      <AccountActiveOrders :orders="active.slice(0, 4)" />
      <div class="side">
        <AccountNextMeeting v-if="nextMeeting" :order="nextMeeting" :lawyer-name="lawyerName" />
        <section class="kh-card notifs">
          <div class="head">
            <h2 class="title">{{ t('account.recentNotifications') }}</h2>
            <NuxtLinkLocale to="/account/notifications" class="all">{{ t('common.all') }}</NuxtLinkLocale>
          </div>
          <AccountNotificationItem v-for="n in recent.data.value" :key="n.id" :item="n" compact @open="open" />
          <p v-if="!recent.data.value.length" class="empty">{{ t('account.noNotifications') }}</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 24px; }
.today { font-size: 14px; color: var(--text-muted); }
.h1 { font-size: clamp(24px, 3vw, 32px); font-weight: 800; margin: 4px 0 0; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: 20px; align-items: start; }
.side { display: flex; flex-direction: column; gap: 20px; }
.notifs { display: flex; flex-direction: column; gap: 10px; }
.head { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 17px; font-weight: 700; margin: 0; }
.all { font-size: 14px; }
.empty { margin: 0; color: var(--text-muted); font-size: 14px; }
</style>
