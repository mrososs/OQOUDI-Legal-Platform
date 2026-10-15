<script setup lang="ts">
import { Search } from '@lucide/vue'
import { MANUAL_METHODS, VERIFICATION_STATUSES } from '#shared/domain/manualPayments'
import type { SortKey } from '~/composables/useAdminManualPayments'

/** Search, status chips, method and sort filters (URL-driven by the parent). */
const props = defineProps<{ status: string | null, method: string | null, q: string, sort: SortKey }>()
const emit = defineEmits<{ change: [patch: Record<string, string | null>] }>()
const { t } = useI18n()

const searchId = useId()
const search = shallowRef(props.q)
watch(() => props.q, (v) => { search.value = v })
let timer: ReturnType<typeof setTimeout> | null = null
function onSearch(v: string | number | null | undefined) {
  search.value = String(v ?? '')
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => emit('change', { q: search.value.trim() || null }), 350)
}
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

const methodOptions = computed(() => [{ value: '', label: t('admin.mpay.filters.allMethods') }, ...MANUAL_METHODS.map(m => ({ value: m, label: t(`mpay.methods.${m}.label`) }))])
const sortOptions = computed(() => (['newest', 'oldest', 'amount_desc', 'amount_asc'] as const).map(s => ({ value: s, label: t(`admin.mpay.sort.${s}`) })))
</script>

<template>
  <div class="filters">
    <div class="chips" role="group" :aria-label="t('admin.mpay.filters.status')">
      <button type="button" class="chip" :aria-pressed="!status" @click="emit('change', { status: null })">{{ t('admin.mpay.filters.all') }}</button>
      <button v-for="s in VERIFICATION_STATUSES" :key="s" type="button" class="chip" :aria-pressed="status === s" @click="emit('change', { status: s })">
        {{ t(`mpay.badge.${s}`) }}
      </button>
    </div>
    <div class="row">
      <div class="search">
        <Search :size="16" aria-hidden="true" class="search-icon" />
        <label :for="searchId" class="visually-hidden">{{ t('admin.mpay.filters.search') }}</label>
        <UiInput :id="searchId" :model-value="search" type="search" :placeholder="t('admin.mpay.filters.search')" @update:model-value="onSearch" />
      </div>
      <UiSelect :model-value="method ?? ''" :options="methodOptions" :aria-label="t('admin.mpay.filters.method')" @update:model-value="v => emit('change', { method: v || null })" />
      <UiSelect :model-value="sort" :options="sortOptions" :aria-label="t('admin.mpay.filters.sort')" @update:model-value="v => emit('change', { sort: !v || v === 'newest' ? null : v })" />
    </div>
  </div>
</template>

<style scoped>
.filters { display: flex; flex-direction: column; gap: 12px; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { padding: 6px 14px; border-radius: 999px; border: 1px solid var(--border-default); background: #fff; color: var(--text-body); font: inherit; font-size: 13px; cursor: pointer; }
.chip[aria-pressed='true'] { background: var(--ink-900); color: var(--cream-100); border-color: var(--ink-900); }
.chip:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.row { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr); gap: 10px; align-items: end; }
.search { position: relative; }
.search-icon { position: absolute; inset-inline-start: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; z-index: 1; }
.search :deep(input) { padding-inline-start: 36px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (max-width: 720px) { .row { grid-template-columns: 1fr; } }
</style>
