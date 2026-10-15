<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import type { Localized } from '#shared/domain/localized'
import type { ManualPaymentConfig, ManualPaymentSettings } from '#shared/domain/manualPayments'
import type { PillNavItem } from '~/components/ui/UiPillNav.vue'
import { fetchAvailability, fetchLawyers, fetchSettings } from '~/repositories/admin'

definePageMeta({ layout: 'lawyer', middleware: ['auth', 'admin'] })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient<Database>()

const { data, refresh } = await useAsyncData('admin:settings', async () => {
  const [settings, availability, lawyers] = await Promise.all([fetchSettings(supabase), fetchAvailability(supabase), fetchLawyers(supabase)])
  return { settings, availability, lawyers }
})

const TABS = ['contact', 'hours', 'blocked', 'booking', 'payments', 'users'] as const
type Tab = (typeof TABS)[number]
const tab = computed<Tab>(() => ((TABS as readonly string[]).includes(String(route.query.tab)) ? route.query.tab as Tab : 'contact'))
const tabs = computed<PillNavItem[]>(() => TABS.map(id => ({ id, label: t(`admin.settings.tabs.${id}`) })))

const contact = computed(() => (data.value?.settings.contact ?? null) as { phone: string, email: string, hours: Localized, address: Localized } | null)
const booking = computed(() => (data.value?.settings.booking ?? null) as { slot_minutes: number, lead_minutes: number, horizon_days: number, hold_minutes: number } | null)
const paymentSettings = computed(() => (data.value?.settings['payments.manual'] ?? null) as ManualPaymentSettings | null)
const requestFetch = useRequestFetch()
const { data: paymentConfig } = await useAsyncData('admin:payment-config', () => requestFetch<ManualPaymentConfig>('/api/payments/manual/config'))
const defaultLawyer = computed(() => ((data.value?.settings['assignment.default_lawyer'] as { lawyer_id?: string | null } | undefined)?.lawyer_id) ?? null)

useSeoMeta({ title: () => t('dash.nav.settings'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <h1 class="title">{{ t('dash.nav.settings') }}</h1>
    <div class="tabs-scroll">
      <UiPillNav :items="tabs" :active-id="tab" :aria-label="t('admin.settings.tabsLabel')" @select="id => router.replace({ query: { tab: id } })" />
    </div>
    <template v-if="data">
      <AdminContactSettings v-if="tab === 'contact'" :value="contact" @saved="refresh" />
      <AdminHoursEditor
        v-else-if="tab === 'hours'"
        :key="JSON.stringify(data.availability.rules)"
        :rules="data.availability.rules"
        :slot-minutes="booking?.slot_minutes ?? 30"
        @saved="refresh"
      />
      <AdminBlockedDates v-else-if="tab === 'blocked'" :exceptions="data.availability.exceptions" @changed="refresh" />
      <AdminBookingSettings
        v-else-if="tab === 'booking'"
        :booking="booking"
        :default-lawyer-id="defaultLawyer"
        :lawyers="data.lawyers"
        @saved="refresh"
      />
      <AdminPaymentSettings
        v-else-if="tab === 'payments'"
        :key="JSON.stringify(paymentSettings)"
        :value="paymentSettings"
        :demo="paymentConfig?.demo ?? true"
        @saved="refresh"
      />
      <AdminUsersRoles v-else />
    </template>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; max-width: 960px; }
.title { font-size: 26px; font-weight: 800; margin: 0; }
.tabs-scroll { overflow-x: auto; overflow-y: hidden; }
</style>
