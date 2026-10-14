<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import type { PillNavItem } from '~/components/ui/UiPillNav.vue'
import { fetchAllCategories } from '~/repositories/admin'

definePageMeta({ layout: 'lawyer', middleware: ['auth', 'admin'] })

const { t } = useI18n()
const f = useFormat()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const supabase = useSupabaseClient<Database>()

const serviceId = computed(() => String(route.params.id))
const editor = useServiceEditor(serviceId)
const { data: categories } = await useAsyncData('admin:categories', () => fetchAllCategories(supabase), { default: () => [] })
await editor.ready

const UUID_RE = /^[0-9a-f-]{36}$/i
if (!editor.isNew.value && !UUID_RE.test(serviceId.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Service not found', fatal: true })
}

watch(
  [() => editor.data.value, () => categories.value],
  ([d, cats]) => {
    if (editor.isNew.value || d) editor.resetFrom(d ?? null, cats[0]?.id ?? '')
  },
  { immediate: true },
)

if (!editor.isNew.value && editor.status.value === 'success' && !editor.data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Service not found', fatal: true })
}

const TABS = ['basics', 'pricing', 'sections', 'form'] as const
type Tab = (typeof TABS)[number]
const tab = computed<Tab>(() => (TABS as readonly string[]).includes(String(route.query.tab)) ? route.query.tab as Tab : 'basics')
const tabs = computed<PillNavItem[]>(() => TABS.map(id => ({ id, label: t(`admin.editor.tabs.${id}`) })))

const title = computed(() => f.text(editor.draft.value.title) || t('admin.editor.newTitle'))
const statusTone = computed(() => ({ published: 'positive', draft: 'caution', archived: 'neutral' } as const)[editor.statusValue.value])
const issueList = computed(() => Object.entries(editor.issues.value).map(([path, code]) => `${t(`admin.issuePaths.${path.split('.')[0]}`, path)}: ${t(`admin.issues.${code}`, t('admin.issues.invalid'))}`))

async function afterWrite(id: string | null) {
  if (!id) return
  if (editor.isNew.value) {
    await router.replace({ path: localePath(`/dashboard/services/${id}`), query: route.query })
  }
  await editor.refresh()
  await refreshNuxtData('admin:services')
}

async function save() {
  await afterWrite(await editor.save())
}
async function publish() {
  await afterWrite(await editor.publish())
}

useSeoMeta({ title, robots: 'noindex' })
</script>

<template>
  <div class="page">
    <div class="sticky-head">
      <div>
        <NuxtLinkLocale to="/dashboard/services" class="back">{{ t('admin.editor.back') }}</NuxtLinkLocale>
        <div class="title-row">
          <h1 class="title">{{ title }}</h1>
          <UiBadge :tone="statusTone">{{ t(`admin.status.${editor.statusValue.value}`) }}</UiBadge>
          <span v-if="editor.dirty.value || editor.formDirty.value" class="dirty">{{ t('admin.editor.unsaved') }}</span>
        </div>
      </div>
      <div class="head-actions">
        <UiButton
          v-if="!editor.isNew.value && editor.statusValue.value === 'published'"
          variant="ghost"
          size="sm"
          :href="localePath(`/service/${editor.draft.value.slug}`)"
        >
          {{ t('admin.editor.viewPage') }}
        </UiButton>
        <UiButton
          v-if="editor.statusValue.value === 'published'"
          variant="ghost"
          size="sm"
          :loading="editor.busy.value === 'status'"
          @click="editor.setStatus('draft')"
        >
          {{ t('admin.editor.unpublish') }}
        </UiButton>
        <UiButton variant="secondary" size="sm" :loading="editor.busy.value === 'save'" :disabled="!!editor.busy.value" @click="save">
          {{ editor.statusValue.value === 'published' ? t('admin.editor.saveChanges') : t('admin.editor.saveDraft') }}
        </UiButton>
        <UiButton size="sm" :loading="editor.busy.value === 'publish'" :disabled="!!editor.busy.value" @click="publish">
          {{ t('admin.editor.publish') }}
        </UiButton>
      </div>
    </div>

    <UiAlert v-if="editor.statusValue.value === 'published'" tone="info">{{ t('admin.editor.liveNote') }}</UiAlert>
    <UiAlert v-if="editor.error.value" :title="editor.error.value">
      <ul v-if="issueList.length" class="issues">
        <li v-for="(i, n) in issueList" :key="n">{{ i }}</li>
      </ul>
    </UiAlert>

    <div class="tabs-scroll">
      <UiPillNav :items="tabs" :active-id="tab" :aria-label="t('admin.editor.tabsLabel')" @select="id => router.replace({ query: { ...route.query, tab: id } })" />
    </div>

    <AdminServiceBasics
      v-if="tab === 'basics'"
      v-model="editor.draft.value"
      :categories="categories"
      :issues="editor.issues.value"
      :is-new="editor.isNew.value"
    />
    <AdminServicePricing v-else-if="tab === 'pricing'" v-model="editor.draft.value" :issues="editor.issues.value" />
    <AdminSectionsEditor v-else-if="tab === 'sections'" v-model="editor.draft.value" />
    <AdminFormBuilder
      v-else
      v-model="editor.fields.value"
      :service-title="title"
      :published-version="editor.publishedVersion.value"
      :has-draft="editor.hasDraftForm.value"
      :can-discard="!!editor.data.value?.draftForm"
      :busy="!!editor.busy.value"
      @discard="editor.discardFormDraft()"
    />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.sticky-head {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;
  position: sticky; top: 0; z-index: 5; background: var(--surface-page); padding: 4px 0 12px;
  border-bottom: 1px solid var(--border-subtle);
}
.back { font-size: 13px; }
.title-row { display: flex; gap: 8px; align-items: center; margin-top: 4px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 800; margin: 0; }
.dirty { font-size: 12px; color: var(--caution-500); }
.head-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.tabs-scroll { overflow-x: auto; overflow-y: hidden; }
.issues { margin: 6px 0 0; padding-inline-start: 18px; font-weight: 500; }
</style>
