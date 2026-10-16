<script setup lang="ts">
import { Search } from '@lucide/vue'
import type { Database } from '#shared/types/database.types'
import type { PillNavItem } from '~/components/ui/UiPillNav.vue'
import { fetchAdminServices, fetchAllCategories } from '~/repositories/admin'

definePageMeta({ layout: 'lawyer', middleware: ['auth', 'admin'] })

const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const route = useRoute()
const router = useRouter()
const { call, toFailure } = useApi()
const toast = useToast()

const { data: services, refresh, status } = await useAsyncData('admin:services', () => fetchAdminServices(supabase), { default: () => [] })
const { data: categories } = await useAsyncData('admin:categories', () => fetchAllCategories(supabase), { default: () => [] })

const query = (k: string) => (typeof route.query[k] === 'string' ? String(route.query[k]) : '')
const setQuery = (patch: Record<string, string | undefined>) => router.replace({ query: { ...route.query, ...patch } })

const tab = computed(() => (['published', 'draft', 'archived'].includes(query('tab')) ? query('tab') : 'all'))
const tabs = computed<PillNavItem[]>(() => [
  { id: 'all', label: t('admin.services.tabs.all') },
  { id: 'published', label: t('admin.services.tabs.published') },
  { id: 'draft', label: t('admin.services.tabs.draft') },
  { id: 'archived', label: t('admin.services.tabs.archived') },
])

const tops = computed(() => categories.value.filter(c => !c.parentId))
const catId = computed({ get: () => query('cat'), set: (v: string | null) => setQuery({ cat: v || undefined, sub: undefined }) })
const subId = computed({ get: () => query('sub'), set: (v: string | null) => setQuery({ sub: v || undefined }) })
const offer = computed({ get: () => query('offer'), set: (v: string | null) => setQuery({ offer: v || undefined }) })
const subs = computed(() => categories.value.filter(c => c.parentId && c.parentId === catId.value))
const topOptions = computed(() => tops.value.map(c => ({ value: c.id, label: f.text(c.title) })))
const subOptions = computed(() => subs.value.map(c => ({ value: c.id, label: f.text(c.title) })))
const offerOptions = computed(() => [
  { value: 'eligible', label: t('admin.services.offer.eligible') },
  { value: 'not', label: t('admin.services.offer.not') },
  { value: 'pending', label: t('admin.services.offer.pendingTranslation') },
])

const searchDraft = shallowRef(query('q'))
const q = computed(() => query('q').trim().toLowerCase())

const categoryById = computed(() => new Map(categories.value.map(c => [c.id, c])))
/** Services whose primary category is the chosen top-level one or one of its sub-categories. */
const inTop = (primaryId: string) => {
  const c = categoryById.value.get(primaryId)
  return c?.id === catId.value || c?.parentId === catId.value
}

const rows = computed(() => services.value.filter((s) => {
  if (tab.value !== 'all' && s.status !== tab.value) return false
  if (catId.value && !inTop(s.primaryCategoryId)) return false
  if (subId.value && s.primaryCategoryId !== subId.value) return false
  if (offer.value === 'eligible' && !s.launchEligible) return false
  if (offer.value === 'not' && s.launchEligible) return false
  if (offer.value === 'pending' && !s.translationPending) return false
  if (q.value) {
    const hay = [s.title.ar, s.title.en ?? '', s.slug, s.sourceRef ?? ''].join(' ').toLowerCase()
    if (!hay.includes(q.value)) return false
  }
  return true
}))

function categoryTitle(id: string) {
  const c = categoryById.value.get(id)
  if (!c) return ''
  const parent = c.parentId ? categoryById.value.get(c.parentId) : null
  return parent ? `${f.text(parent.title)} › ${f.text(c.title)}` : f.text(c.title)
}
const STATUS_TONE = { published: 'positive', draft: 'caution', archived: 'neutral' } as const

function priceLabel(s: (typeof services.value)[number]) {
  return s.pricingType === 'quote' ? t('services.startsFrom', { price: f.money(s.basePriceMinor) }) : f.money(s.basePriceMinor)
}

const busyId = shallowRef<string | null>(null)
async function toggleArchive(s: (typeof services.value)[number]) {
  busyId.value = s.id
  try {
    await call(`/api/admin/services/${s.id}/status`, { method: 'POST', body: { status: s.status === 'archived' ? 'draft' : 'archived' } })
    await refresh()
    toast.success(t('admin.editor.statusChanged'))
  }
  catch (err) {
    toast.error(toFailure(err).message)
  }
  finally {
    busyId.value = null
  }
}

useSeoMeta({ title: () => t('dash.nav.services'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <div class="head">
      <h1 class="title">{{ t('dash.nav.services') }}</h1>
      <UiButton size="sm" to="/dashboard/services/new">{{ t('admin.services.new') }}</UiButton>
    </div>
    <div class="tabs-scroll">
      <UiPillNav :items="tabs" :active-id="tab" :aria-label="t('admin.services.filter')" @select="id => setQuery({ tab: id === 'all' ? undefined : id })" />
    </div>

    <div class="filters">
      <form class="search" role="search" @submit.prevent="setQuery({ q: searchDraft || undefined })">
        <Search :size="18" :stroke-width="1.8" class="search-icon" aria-hidden="true" />
        <input v-model="searchDraft" type="search" :placeholder="t('admin.services.searchPlaceholder')" :aria-label="t('admin.services.searchPlaceholder')" @change="setQuery({ q: searchDraft || undefined })">
      </form>
      <div class="sel"><UiSelect v-model="catId" :options="topOptions" :placeholder="t('admin.services.allCategories')" :aria-label="t('admin.services.cols.category')" /></div>
      <div v-if="subOptions.length" class="sel"><UiSelect v-model="subId" :options="subOptions" :placeholder="t('admin.services.allSubcategories')" :aria-label="t('admin.services.subcategory')" /></div>
      <div class="sel"><UiSelect v-model="offer" :options="offerOptions" :placeholder="t('admin.services.offer.all')" :aria-label="t('admin.services.offer.label')" /></div>
      <NuxtLinkLocale to="/dashboard/campaign" class="campaign-link">{{ t('admin.services.manageCampaign') }}</NuxtLinkLocale>
    </div>
    <div class="count" aria-live="polite">{{ t('admin.services.count', { n: f.number(rows.length), total: f.number(services.length) }) }}</div>

    <div class="kh-card table-card">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.services.cols.service') }}</th>
            <th>{{ t('admin.services.cols.category') }}</th>
            <th>{{ t('admin.services.cols.price') }}</th>
            <th>{{ t('admin.services.cols.sections') }}</th>
            <th>{{ t('admin.services.cols.form') }}</th>
            <th>{{ t('admin.services.cols.status') }}</th>
            <th><span class="sr-only">{{ t('admin.services.cols.actions') }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in rows" :key="s.id">
            <td>
              <strong class="strong">{{ f.text(s.title) }}</strong>
              <div class="ltr slug">{{ s.slug }}<template v-if="s.sourceRef"> · {{ s.sourceRef.split(':')[1] }}</template></div>
              <div v-if="s.hasDraftForm" class="draft-note">{{ t('admin.services.unpublishedDraft') }}</div>
              <div v-if="s.translationPending" class="pending-note">{{ t('admin.services.translationPending') }}</div>
            </td>
            <td>{{ categoryTitle(s.primaryCategoryId) }}</td>
            <td>
              {{ priceLabel(s) }}
              <div v-if="s.launchEligible && s.launchPriceMinor !== null" class="launch-price">{{ t('admin.services.launchPrice', { price: f.money(s.launchPriceMinor) }) }}</div>
            </td>
            <td>{{ f.number(s.enabledSections) }}</td>
            <td>
              <template v-if="s.publishedFormVersion">
                {{ t('admin.services.formCell', { v: f.number(s.publishedFormVersion), n: f.number(s.publishedFieldCount) }) }}
              </template>
              <span v-else class="muted">—</span>
            </td>
            <td><UiBadge :tone="STATUS_TONE[s.status]">{{ t(`admin.status.${s.status}`) }}</UiBadge></td>
            <td class="actions">
              <NuxtLinkLocale :to="`/dashboard/services/${s.id}`" class="edit">{{ t('common.edit') }}</NuxtLinkLocale>
              ·
              <button type="button" class="link-muted" :disabled="busyId === s.id" @click="toggleArchive(s)">
                {{ s.status === 'archived' ? t('admin.services.restore') : t('admin.services.archive') }}
              </button>
            </td>
          </tr>
          <tr v-if="!rows.length && status !== 'pending'">
            <td colspan="7" class="empty">{{ t('admin.services.empty') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.title { font-size: 26px; font-weight: 800; margin: 0; }
.tabs-scroll { overflow-x: auto; overflow-y: hidden; }
.filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.search {
  flex: 1 1 260px; display: flex; align-items: center; gap: 8px; background: #fff;
  border: 1.5px solid var(--border-default); border-radius: 12px; padding: 0 12px;
}
.search:focus-within { border-color: var(--accent); box-shadow: var(--shadow-focus); }
.search-icon { color: var(--text-muted); flex-shrink: 0; }
.search input { flex: 1; border: none; outline: none; font-size: 14px; padding: 10px 0; background: transparent; min-width: 0; }
.sel { width: 200px; }
.campaign-link { font-weight: 600; font-size: 14px; margin-inline-start: auto; }
.count { font-size: 13px; color: var(--text-muted); }
.table-card { padding: 0; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 900px; font-size: 14px; }
.table th { background: var(--neutral-100); text-align: start; color: var(--text-muted); font-weight: 600; padding: 10px 16px; }
.table td { padding: 12px 16px; border-top: 1px solid var(--border-subtle); vertical-align: top; }
.strong { color: var(--text-strong); }
.slug { font-size: 11px; color: var(--text-muted); }
.draft-note { font-size: 11px; color: var(--caution-500); }
.pending-note { font-size: 11px; color: var(--text-muted); }
.launch-price { font-size: 12px; color: var(--gold-700); font-weight: 700; }
.actions { white-space: nowrap; text-align: end; }
.edit { font-weight: 600; }
.link-muted { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px; }
.empty { text-align: center; color: var(--text-muted); padding: 32px; }
</style>
