<script setup lang="ts">
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

const tab = computed(() => (['published', 'draft', 'archived'].includes(String(route.query.tab)) ? String(route.query.tab) : 'all'))
const tabs = computed<PillNavItem[]>(() => [
  { id: 'all', label: t('admin.services.tabs.all') },
  { id: 'published', label: t('admin.services.tabs.published') },
  { id: 'draft', label: t('admin.services.tabs.draft') },
  { id: 'archived', label: t('admin.services.tabs.archived') },
])
const rows = computed(() => services.value.filter(s => tab.value === 'all' || s.status === tab.value))
const categoryTitle = (id: string) => f.text(categories.value.find(c => c.id === id)?.title)
const STATUS_TONE = { published: 'positive', draft: 'caution', archived: 'neutral' } as const

function priceLabel(s: (typeof services.value)[number]) {
  return s.pricingType === 'quote' ? t('services.startsFrom', { price: f.money(s.basePriceMinor) }) : f.money(s.basePriceMinor)
}

const busyId = shallowRef<string | null>(null)
async function toggleArchive(s: (typeof services.value)[number]) {
  busyId.value = s.id
  try {
    if (s.status === 'archived') {
      await call(`/api/admin/services/${s.id}/status`, { method: 'POST', body: { status: 'draft' } })
    }
    else {
      await call(`/api/admin/services/${s.id}/status`, { method: 'POST', body: { status: 'archived' } })
    }
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
      <UiPillNav :items="tabs" :active-id="tab" :aria-label="t('admin.services.filter')" @select="id => router.replace({ query: id === 'all' ? {} : { tab: id } })" />
    </div>

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
              <div class="ltr slug">{{ s.slug }}</div>
              <div v-if="s.hasDraftForm" class="draft-note">{{ t('admin.services.unpublishedDraft') }}</div>
            </td>
            <td>{{ categoryTitle(s.primaryCategoryId) }}</td>
            <td>{{ priceLabel(s) }}</td>
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
.table-card { padding: 0; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 820px; font-size: 14px; }
.table th { background: var(--neutral-100); text-align: start; color: var(--text-muted); font-weight: 600; padding: 10px 16px; }
.table td { padding: 12px 16px; border-top: 1px solid var(--border-subtle); vertical-align: top; }
.strong { color: var(--text-strong); }
.slug { font-size: 11px; color: var(--text-muted); }
.draft-note { font-size: 11px; color: var(--caution-500); }
.actions { white-space: nowrap; text-align: end; }
.edit { font-weight: 600; }
.link-muted { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px; }
.empty { text-align: center; color: var(--text-muted); padding: 32px; }
</style>
