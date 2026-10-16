<script setup lang="ts">
import { Search } from '@lucide/vue'
import type { Database } from '#shared/types/database.types'
import { CAMPAIGN_DAYS, cairoToday, computeCampaignWindow, remainingParts, type CampaignState } from '#shared/domain/pricing'
import { fetchAdminServices, fetchAllCategories, fetchLaunchAddonPrices } from '~/repositories/admin'

/**
 * Launch campaign control. The campaign never starts on deployment: it is DISABLED with no date
 * until an admin enables it with an explicit Cairo activation date. The 15-day end is computed
 * (Cairo calendar days) by the database. Prices charged are always decided server-side.
 */
definePageMeta({ layout: 'lawyer', middleware: ['auth', 'admin'] })

const { t, locale } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const { call, toFailure } = useApi()
const toast = useToast()

interface CampaignPayload { state: CampaignState, eligibleServices: number, publishedServices: number }
// SSR must forward the admin's session cookies to the API
const requestFetch = useRequestFetch()
const { data, refresh } = await useAsyncData('admin:campaign', () => requestFetch<CampaignPayload>('/api/admin/campaign'))
if (!data.value) {
  throw createError({ statusCode: 403, statusMessage: 'Forbidden', fatal: true })
}
const { data: services, refresh: refreshServices } = await useAsyncData('admin:services', () => fetchAdminServices(supabase), { default: () => [] })
const { data: categories } = await useAsyncData('admin:categories', () => fetchAllCategories(supabase), { default: () => [] })
const { data: addonPrices } = await useAsyncData('admin:launch-addons', () => fetchLaunchAddonPrices(supabase), { default: () => ({}) as Record<string, { vip: { regular: number | null, launch: number | null } | null, bilingual: { regular: number | null, launch: number | null } | null }> })

const state = computed(() => data.value!.state)
const enabled = ref(state.value.enabled)
const startDate = ref(state.value.startDate ?? '')
const startTime = ref(state.value.startTime || '00:00')
const busy = shallowRef(false)
const error = shallowRef('')

// Live clock only after mount (the page is admin-only, but keep hydration identical anyway).
const nowMs = shallowRef(Date.parse(state.value.serverNow))
onMounted(() => {
  const offset = Date.parse(state.value.serverNow) - Date.now()
  const id = setInterval(() => { nowMs.value = Date.now() + offset }, 1000)
  onBeforeUnmount(() => clearInterval(id))
})

const status = computed(() => {
  const s = state.value
  if (!s.enabled || !s.startsAt || !s.endsAt) return 'disabled'
  if (nowMs.value < Date.parse(s.startsAt)) return 'scheduled'
  if (nowMs.value < Date.parse(s.endsAt)) return 'active'
  return 'expired'
})
const TONE = { active: 'positive', scheduled: 'caution', expired: 'neutral', disabled: 'neutral' } as const

const window = computed(() => (startDate.value ? computeCampaignWindow(startDate.value, startTime.value) : null))
const today = computed(() => cairoToday(nowMs.value))
const dateError = computed(() => (enabled.value && startDate.value && startDate.value < today.value ? t('errors.OQ422_CAMPAIGN_DATE') : ''))
const locked = computed(() => status.value === 'active')
const remaining = computed(() => (state.value.endsAt ? remainingParts(Date.parse(state.value.endsAt), nowMs.value) : null))
const dirty = computed(() => enabled.value !== state.value.enabled || (enabled.value && (startDate.value !== (state.value.startDate ?? '') || startTime.value !== state.value.startTime)))
const canSave = computed(() => !busy.value && dirty.value && !dateError.value && (!enabled.value || !!window.value))

async function save() {
  busy.value = true
  error.value = ''
  try {
    await call('/api/admin/campaign', { method: 'POST', body: { enabled: enabled.value, startDate: enabled.value ? startDate.value : null, startTime: startTime.value } })
    await refresh()
    enabled.value = state.value.enabled
    toast.success(t('admin.campaign.saved'))
  }
  catch (err) {
    error.value = toFailure(err).message
  }
  finally {
    busy.value = false
  }
}
async function disableNow() {
  enabled.value = false
  await save()
}

// ---- eligible contracts
const search = shallowRef('')
const categoryById = computed(() => new Map(categories.value.map(c => [c.id, c])))
const catalog = computed(() => services.value
  .filter(s => s.launchPriceMinor !== null && s.pricingType === 'fixed' && s.kind === 'standard')
  .filter(s => !search.value.trim() || [s.title.ar, s.title.en ?? '', s.slug].join(' ').toLowerCase().includes(search.value.trim().toLowerCase())))
const categoryTitle = (id: string) => {
  const c = categoryById.value.get(id)
  const parent = c?.parentId ? categoryById.value.get(c.parentId) : null
  return parent ? `${f.text(parent.title)} › ${f.text(c!.title)}` : f.text(c?.title)
}
const eligibleCount = computed(() => services.value.filter(s => s.launchEligible && s.status === 'published').length)
const pct = (s: { basePriceMinor: number, launchPriceMinor: number | null }) =>
  s.launchPriceMinor !== null && s.basePriceMinor ? Math.round((100 * (s.basePriceMinor - s.launchPriceMinor)) / s.basePriceMinor) : 0

const togglingId = shallowRef<string | null>(null)
async function setEligible(s: (typeof services.value)[number], value: boolean) {
  togglingId.value = s.id
  try {
    await call('/api/admin/prices', { method: 'POST', body: { prices: [{ serviceId: s.id, pricingType: s.pricingType, basePriceMinor: s.basePriceMinor, launchPriceMinor: s.launchPriceMinor, launchEligible: value }] } })
    await Promise.all([refreshServices(), refresh()])
  }
  catch (err) {
    toast.error(toFailure(err).message)
  }
  finally {
    togglingId.value = null
  }
}
async function setAll(value: boolean) {
  busy.value = true
  try {
    const prices = catalog.value
      .filter(s => s.launchEligible !== value)
      .map(s => ({ serviceId: s.id, pricingType: s.pricingType, basePriceMinor: s.basePriceMinor, launchPriceMinor: s.launchPriceMinor, launchEligible: value }))
    if (prices.length) await call('/api/admin/prices', { method: 'POST', body: { prices } })
    await Promise.all([refreshServices(), refresh()])
    toast.success(t('admin.campaign.eligibleSaved'))
  }
  catch (err) {
    toast.error(toFailure(err).message)
  }
  finally {
    busy.value = false
  }
}
const money = (n: number | null | undefined) => (n == null ? '—' : f.money(n))

useSeoMeta({ title: () => t('admin.campaign.title'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <div class="head">
      <h1 class="title">{{ t('admin.campaign.title') }}</h1>
      <UiBadge :tone="TONE[status]" dot>{{ t(`admin.campaign.status.${status}`) }}</UiBadge>
    </div>
    <p class="lead">{{ t('admin.campaign.lead', { days: f.number(CAMPAIGN_DAYS) }) }}</p>

    <section class="kh-card box" aria-labelledby="camp-settings">
      <h2 id="camp-settings" class="h2">{{ t('admin.campaign.settings') }}</h2>
      <UiAlert v-if="error" tone="critical">{{ error }}</UiAlert>
      <UiAlert v-if="status === 'active' && remaining" tone="info">
        {{ t('admin.campaign.activeNote') }}
        <strong>{{ formatRemaining(remaining, locale) }}</strong>
      </UiAlert>
      <UiAlert v-else-if="status === 'expired'" tone="info">{{ t('admin.campaign.expiredNote') }}</UiAlert>
      <UiAlert v-else-if="status === 'disabled'" tone="info">{{ t('admin.campaign.disabledNote') }}</UiAlert>

      <AdminSwitch v-model="enabled" :label="t('admin.campaign.enable')" :disabled="locked" />

      <div class="fields">
        <UiInput
          v-model="startDate"
          type="date"
          :label="t('admin.campaign.startDate')"
          :disabled="!enabled || locked"
          :min="today"
          :hint="t('admin.campaign.startDateHint')"
          :error="dateError"
        />
        <UiInput v-model="startTime" type="time" :label="t('admin.campaign.startTime')" :disabled="!enabled || locked" />
        <div class="kh-field">
          <span class="kh-field__label">{{ t('admin.campaign.ends') }}</span>
          <div class="computed">
            <template v-if="enabled && window">{{ f.dateTime(window.endsAt) }} <span class="muted">({{ t('admin.campaign.endsNote', { days: f.number(CAMPAIGN_DAYS) }) }})</span></template>
            <span v-else class="muted">—</span>
          </div>
        </div>
      </div>
      <p v-if="enabled && window" class="muted small">
        {{ t('admin.campaign.window', { from: f.dateTime(window.startsAt), to: f.dateTime(window.endsAt) }) }}
      </p>

      <div class="actions">
        <UiButton :disabled="!canSave" :loading="busy" @click="save">{{ enabled ? t('admin.campaign.saveEnable') : t('admin.campaign.saveDisable') }}</UiButton>
        <UiButton v-if="locked" variant="danger" :disabled="busy" @click="disableNow">{{ t('admin.campaign.disableNow') }}</UiButton>
      </div>
      <p class="muted small">{{ t('admin.campaign.noAutoStart') }}</p>
    </section>

    <section class="kh-card box" aria-labelledby="camp-contracts">
      <div class="row-head">
        <h2 id="camp-contracts" class="h2">{{ t('admin.campaign.contracts') }}</h2>
        <span class="muted small">{{ t('admin.campaign.eligibleCount', { n: f.number(eligibleCount), total: f.number(services.filter(s => s.launchPriceMinor !== null).length) }) }}</span>
      </div>
      <p class="muted small">{{ t('admin.campaign.contractsNote') }}</p>
      <div class="tools">
        <label class="search">
          <Search :size="16" aria-hidden="true" />
          <input v-model="search" type="search" :placeholder="t('admin.services.searchPlaceholder')" :aria-label="t('admin.services.searchPlaceholder')">
        </label>
        <UiButton size="sm" variant="secondary" :disabled="busy" @click="setAll(true)">{{ t('admin.campaign.includeAll') }}</UiButton>
        <UiButton size="sm" variant="ghost" :disabled="busy" @click="setAll(false)">{{ t('admin.campaign.excludeAll') }}</UiButton>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('admin.services.cols.service') }}</th>
              <th>{{ t('admin.campaign.regular') }}</th>
              <th>{{ t('admin.campaign.launch') }}</th>
              <th>{{ t('admin.campaign.vip') }}</th>
              <th>{{ t('admin.campaign.bilingual') }}</th>
              <th>{{ t('admin.campaign.included') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in catalog" :key="s.id">
              <td>
                <NuxtLinkLocale :to="`/dashboard/services/${s.id}?tab=pricing`" class="name">{{ f.text(s.title) }}</NuxtLinkLocale>
                <div class="muted small">{{ categoryTitle(s.primaryCategoryId) }}</div>
              </td>
              <td>{{ money(s.basePriceMinor) }}</td>
              <td><strong>{{ money(s.launchPriceMinor) }}</strong> <span class="pct">−{{ f.number(pct(s)) }}%</span></td>
              <td class="small">{{ addonPrices[s.id]?.vip ? `${money(addonPrices[s.id]!.vip!.launch)} / ${money(addonPrices[s.id]!.vip!.regular)}` : '—' }}</td>
              <td class="small">{{ addonPrices[s.id]?.bilingual ? `${money(addonPrices[s.id]!.bilingual!.launch)} / ${money(addonPrices[s.id]!.bilingual!.regular)}` : '—' }}</td>
              <td>
                <AdminSwitch
                  :model-value="s.launchEligible"
                  :aria-label="t('admin.campaign.included')"
                  :disabled="togglingId === s.id"
                  @update:model-value="v => setEligible(s, v)"
                />
              </td>
            </tr>
            <tr v-if="!catalog.length"><td colspan="6" class="empty">{{ t('admin.services.empty') }}</td></tr>
          </tbody>
        </table>
      </div>
      <p class="muted small">{{ t('admin.campaign.addonLegend') }}</p>
    </section>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; max-width: 1100px; }
.head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.title { font-size: 26px; font-weight: 800; margin: 0; }
.lead { margin: 0; color: var(--text-body); line-height: 1.8; max-width: 760px; }
.box { display: flex; flex-direction: column; gap: 14px; }
.h2 { font-size: 18px; font-weight: 700; margin: 0; }
.fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 14px; align-items: start; }
.computed { padding: 11px 0; font-weight: 600; color: var(--text-strong); }
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
.small { font-size: 13px; margin: 0; }
.row-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.tools { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.search { flex: 1 1 240px; display: flex; align-items: center; gap: 8px; background: #fff; border: 1.5px solid var(--border-default); border-radius: 12px; padding: 0 12px; }
.search input { flex: 1; border: none; outline: none; padding: 9px 0; font-size: 14px; background: transparent; min-width: 0; }
.table-wrap { max-height: 560px; overflow: auto; border: 1px solid var(--border-subtle); border-radius: 12px; }
.table { width: 100%; border-collapse: collapse; min-width: 820px; font-size: 14px; }
.table th { position: sticky; top: 0; background: var(--neutral-100); text-align: start; color: var(--text-muted); font-weight: 600; padding: 10px 14px; }
.table td { padding: 10px 14px; border-top: 1px solid var(--border-subtle); vertical-align: middle; }
.name { font-weight: 600; }
.pct { font-size: 12px; color: var(--gold-700); font-weight: 700; margin-inline-start: 4px; }
.empty { text-align: center; color: var(--text-muted); padding: 24px; }
</style>
