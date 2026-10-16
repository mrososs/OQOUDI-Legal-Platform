<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { fetchLatestImportRun, type ImportItem } from '~/repositories/admin'

/**
 * Import status: what the last catalog import created, updated, matched (already identical),
 * skipped or failed. The import itself runs as a database migration / script — never from the
 * browser — so this panel is read-only evidence.
 */
definePageMeta({ layout: 'lawyer', middleware: ['auth', 'admin'] })

const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()

const { data: run } = await useAsyncData('admin:catalog-import', () => fetchLatestImportRun(supabase))

const filter = shallowRef<'all' | ImportItem['outcome']>('all')
const kind = shallowRef<'all' | ImportItem['kind']>('all')
const OUTCOMES = ['created', 'updated', 'matched', 'skipped', 'failed'] as const
const TONE = { created: 'positive', updated: 'accent', matched: 'neutral', skipped: 'caution', failed: 'critical' } as const

const items = computed(() => (run.value?.items ?? []).filter(i => (filter.value === 'all' || i.outcome === filter.value) && (kind.value === 'all' || i.kind === kind.value)))
const count = (kindKey: ImportItem['kind'], outcome: ImportItem['outcome']) => run.value?.summary?.[`${kindKey}.${outcome}`] ?? 0
const totalFor = (outcome: ImportItem['outcome']) => count('service', outcome) + count('category', outcome)

useSeoMeta({ title: () => t('admin.import.title'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <div class="head">
      <h1 class="title">{{ t('admin.import.title') }}</h1>
      <UiBadge v-if="run" :tone="run.status === 'succeeded' ? 'positive' : run.status === 'failed' ? 'critical' : 'caution'" dot>{{ t(`admin.import.runStatus.${run.status}`) }}</UiBadge>
    </div>
    <p class="lead">{{ t('admin.import.lead') }}</p>

    <UiEmptyState v-if="!run" :title="t('admin.import.noneTitle')" :description="t('admin.import.noneText')" />
    <template v-else>
      <p class="muted small">{{ t('admin.import.meta', { batch: run.batchKey, date: f.dateTime(run.startedAt) }) }}</p>
      <div class="stats">
        <button v-for="o in OUTCOMES" :key="o" type="button" class="stat" :aria-pressed="filter === o" @click="filter = filter === o ? 'all' : o">
          <span class="stat-n">{{ f.number(totalFor(o)) }}</span>
          <span class="stat-l">{{ t(`admin.import.outcome.${o}`) }}</span>
          <span class="stat-s muted">{{ t('admin.import.split', { s: f.number(count('service', o)), c: f.number(count('category', o)) }) }}</span>
        </button>
      </div>

      <div class="kinds" role="group" :aria-label="t('admin.import.kind.label')">
        <button v-for="k in (['all', 'service', 'category'] as const)" :key="k" type="button" class="pill" :aria-pressed="kind === k" @click="kind = k">
          {{ t(`admin.import.kind.${k}`) }}
        </button>
      </div>

      <div class="kh-card table-card">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('admin.import.cols.ref') }}</th>
              <th>{{ t('admin.import.cols.slug') }}</th>
              <th>{{ t('admin.import.cols.outcome') }}</th>
              <th>{{ t('admin.import.cols.details') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in items" :key="i.id">
              <td class="ltr mono">{{ i.ref.includes(':') ? i.ref.split(':')[1] : i.ref }}</td>
              <td class="ltr">
                <NuxtLinkLocale v-if="i.serviceId" :to="`/dashboard/services/${i.serviceId}`">{{ i.details.slug }}</NuxtLinkLocale>
                <template v-else>{{ i.kind === 'category' ? i.ref : i.details.slug }}</template>
              </td>
              <td><UiBadge :tone="TONE[i.outcome]">{{ t(`admin.import.outcome.${i.outcome}`) }}</UiBadge></td>
              <td class="small">
                <span v-if="i.details.reusedExisting" class="tag">{{ t('admin.import.reused') }}</span>
                <span v-if="i.details.formVersion" class="tag">{{ t('admin.import.formVersion', { v: f.number(i.details.formVersion) }) }}</span>
                <span v-for="c in i.details.changes ?? []" :key="c" class="tag tag--soft">{{ c }}</span>
                <span v-if="i.details.error" class="err">{{ i.details.error }}</span>
              </td>
            </tr>
            <tr v-if="!items.length"><td colspan="4" class="empty">{{ t('admin.services.empty') }}</td></tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; max-width: 1100px; }
.head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.title { font-size: 26px; font-weight: 800; margin: 0; }
.lead { margin: 0; color: var(--text-body); line-height: 1.8; max-width: 760px; }
.small { font-size: 13px; margin: 0; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.stat {
  text-align: start; background: #fff; border: 1.5px solid var(--border-subtle); border-radius: 14px; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 2px; cursor: pointer;
}
.stat[aria-pressed='true'] { border-color: var(--ink-900); background: var(--gold-50); }
.stat-n { font-family: var(--font-heading); font-size: 28px; font-weight: 800; color: var(--text-strong); }
.stat-l { font-weight: 600; color: var(--text-strong); }
.stat-s { font-size: 12px; }
.kinds { display: flex; gap: 6px; flex-wrap: wrap; }
.pill { border: 1px solid var(--border-default); background: #fff; color: var(--text-body); border-radius: 999px; padding: 7px 14px; font-size: 13px; cursor: pointer; }
.pill[aria-pressed='true'] { border-color: var(--ink-900); background: var(--ink-900); color: var(--cream-100); }
.table-card { padding: 0; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 720px; font-size: 14px; }
.table th { background: var(--neutral-100); text-align: start; color: var(--text-muted); font-weight: 600; padding: 10px 14px; }
.table td { padding: 9px 14px; border-top: 1px solid var(--border-subtle); vertical-align: top; }
.mono { font-variant-numeric: tabular-nums; }
.tag { display: inline-block; font-size: 11px; font-weight: 700; background: var(--gold-50); border: 1px solid var(--gold-200); border-radius: 999px; padding: 1px 8px; margin: 0 4px 2px 0; }
.tag--soft { background: var(--neutral-100); border-color: var(--neutral-200); color: var(--text-muted); font-weight: 600; }
.err { color: var(--critical-500); }
.empty { text-align: center; color: var(--text-muted); padding: 28px; }
</style>
