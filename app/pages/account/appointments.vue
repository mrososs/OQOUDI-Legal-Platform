<script setup lang="ts">
definePageMeta({ layout: 'client', middleware: ['auth'] })

const { t } = useI18n()
const { data: orders } = await useCustomerOrders()

const withBooking = computed(() => orders.value.filter(o => o.booking))
const isPast = (o: (typeof withBooking.value)[number]) =>
  ['completed', 'cancelled'].includes(o.status) || new Date(o.booking!.endsAt).getTime() < Date.now()
const upcoming = computed(() => withBooking.value.filter(o => !isPast(o)).sort((a, b) => a.booking!.startsAt.localeCompare(b.booking!.startsAt)))
const past = computed(() => withBooking.value.filter(isPast).sort((a, b) => b.booking!.startsAt.localeCompare(a.booking!.startsAt)))

useSeoMeta({ title: () => t('account.appointments.title'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <h1 class="h1">{{ t('account.appointments.title') }}</h1>
    <UiEmptyState v-if="!withBooking.length" :title="t('account.appointments.emptyTitle')" :description="t('account.appointments.empty')">
      <UiButton to="/service/video-consultation">{{ t('account.appointments.book') }}</UiButton>
    </UiEmptyState>
    <template v-else>
      <section v-if="upcoming.length" class="group">
        <h2 class="h2">{{ t('account.appointments.upcoming') }}</h2>
        <AccountAppointmentRow v-for="o in upcoming" :key="o.id" :order="o" />
      </section>
      <section v-if="past.length" class="group">
        <h2 class="h2">{{ t('account.appointments.past') }}</h2>
        <AccountAppointmentRow v-for="o in past" :key="o.id" :order="o" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }
.h1 { font-size: clamp(24px, 3vw, 32px); font-weight: 800; margin: 0; }
.h2 { font-size: 16px; font-weight: 700; margin: 0; font-family: var(--font-sans); }
.group { display: flex; flex-direction: column; gap: 10px; }
</style>
