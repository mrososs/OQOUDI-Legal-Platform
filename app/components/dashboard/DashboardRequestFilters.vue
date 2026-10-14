<script setup lang="ts">
import { Search } from '@lucide/vue'
import { ORDER_STATUSES, PAYMENT_STATUSES, type OrderStatus } from '#shared/domain/orderStatus'

/** Search + payment select + status chips (with counts). Values are owned by the parent (URL query). */
const q = defineModel<string>('q', { required: true })
const status = defineModel<string>('status', { required: true })
const pay = defineModel<string>('pay', { required: true })

const props = defineProps<{ counts: Partial<Record<OrderStatus | 'all', number>> }>()

const { t } = useI18n()
const f = useFormat()

const draft = shallowRef(q.value)
watch(q, (v) => {
  draft.value = v
})

const payOptions = computed(() => [
  { value: 'all', label: t('dashOps.filters.allPayments') },
  ...PAYMENT_STATUSES.map(p => ({ value: p, label: t(`pay.${p}`) })),
])
const chips = computed(() => [
  { id: 'all', label: t('common.all'), n: props.counts.all ?? 0 },
  ...ORDER_STATUSES.map(s => ({ id: s, label: t(`status.${s}.label`), n: props.counts[s] ?? 0 })),
])
</script>

<template>
  <div class="filters">
    <div class="row">
      <form class="search" role="search" @submit.prevent="q = draft.trim()">
        <Search :size="16" :stroke-width="1.8" class="icon" aria-hidden="true" />
        <input
          v-model="draft"
          type="search"
          :placeholder="t('dashOps.filters.search')"
          :aria-label="t('dashOps.filters.search')"
          @change="q = draft.trim()"
        >
      </form>
      <div class="pay">
        <UiSelect v-model="pay" :options="payOptions" :aria-label="t('dashOps.table.payment')" />
      </div>
    </div>
    <div class="chips" role="group" :aria-label="t('dashOps.table.status')">
      <button
        v-for="c in chips"
        :key="c.id"
        type="button"
        class="chip"
        :aria-pressed="status === c.id"
        @click="status = c.id"
      >
        {{ c.label }} <span class="n">{{ f.number(c.n) }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.filters { display: flex; flex-direction: column; gap: 10px; }
.row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.search {
  flex: 1 1 260px; display: flex; align-items: center; gap: 8px; background: #fff;
  border: 1.5px solid var(--border-default); border-radius: 10px; padding: 0 12px;
}
.search:focus-within { border-color: var(--accent); box-shadow: var(--shadow-focus); }
.icon { color: var(--text-muted); flex-shrink: 0; }
.search input { flex: 1; border: none; outline: none; padding: 10px 0; background: transparent; min-width: 0; font-size: 15px; }
.pay { width: 200px; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip {
  padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border-default); background: #fff;
  color: var(--text-body); font-size: 13px; cursor: pointer; white-space: nowrap;
}
.chip[aria-pressed='true'] { background: var(--ink-900); border-color: var(--ink-900); color: var(--cream-100); }
.n { opacity: 0.7; }
</style>
