<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

/**
 * Sub-category navigation with accurate counts.
 * Wide screens: scrollable pills. Phones: one native select (large touch target, no horizontal hunting).
 */
export interface CategoryNavItem {
  id: string
  label: string
  count: number
  to: RouteLocationRaw
}

const props = defineProps<{
  items: CategoryNavItem[]
  activeId: string
  navLabel: string
}>()

const { push } = useRouter()
const localePath = useLocalePath()
const f = useFormat()

const options = computed(() => props.items.map(i => ({ value: i.id, label: `${i.label} (${f.number(i.count)})` })))
const selected = computed({
  get: () => props.activeId,
  set: (id: string | null) => {
    const item = props.items.find(i => i.id === id)
    if (item) push(localePath(item.to as never))
  },
})
</script>

<template>
  <div class="catnav">
    <nav class="pills" :aria-label="navLabel">
      <NuxtLinkLocale
        v-for="item in items"
        :key="item.id"
        :to="(item.to as never)"
        class="pill"
        :aria-current="item.id === activeId ? 'page' : undefined"
      >
        {{ item.label }} <span class="count">{{ f.number(item.count) }}</span>
      </NuxtLinkLocale>
    </nav>
    <div class="mobile">
      <UiSelect v-model="selected" :options="options" :aria-label="navLabel" />
    </div>
  </div>
</template>

<style scoped>
.pills { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
.pill {
  flex: 0 0 auto; display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px;
  border: 1px solid var(--border-default); background: #fff; color: var(--text-body); font-size: 14px; white-space: nowrap;
}
.pill:hover { border-color: var(--gold-400); color: var(--text-strong); }
.pill[aria-current='page'] { background: var(--ink-900); border-color: var(--ink-900); color: var(--cream-100); }
.count {
  font-size: 12px; font-weight: 700; min-width: 22px; text-align: center; padding: 1px 6px; border-radius: 999px;
  background: var(--neutral-100); color: var(--text-muted);
}
.pill[aria-current='page'] .count { background: rgba(255, 255, 255, 0.16); color: var(--cream-100); }
.mobile { display: none; }
@media (max-width: 719px) {
  .pills { display: none; }
  .mobile { display: block; }
}
</style>
