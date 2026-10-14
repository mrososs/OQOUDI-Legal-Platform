<script setup lang="ts">
import type { Localized } from '#shared/domain/localized'

/** Ordered list of localized items (who/included/deliverables/docs/steps). */
const items = defineModel<Localized[]>({ required: true })
const { t } = useI18n()
const f = useFormat()

function update(i: number, v: Localized) {
  items.value = items.value.map((x, j) => (j === i ? v : x))
}
function move(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= items.value.length) return
  const next = [...items.value]
  ;[next[i], next[j]] = [next[j]!, next[i]!]
  items.value = next
}
</script>

<template>
  <div class="list">
    <div v-for="(item, i) in items" :key="i" class="row">
      <span class="num">{{ f.number(i + 1) }}</span>
      <div class="grow">
        <AdminLocalizedInput :model-value="item" :label="t('admin.sections.item')" compact @update:model-value="v => update(i, v)" />
      </div>
      <div class="ctrls">
        <button type="button" :aria-label="t('admin.common.up')" :disabled="i === 0" @click="move(i, -1)">▲</button>
        <button type="button" :aria-label="t('admin.common.down')" :disabled="i === items.length - 1" @click="move(i, 1)">▼</button>
        <button type="button" class="del" :aria-label="t('admin.common.remove')" @click="items = items.filter((_, j) => j !== i)">×</button>
      </div>
    </div>
    <button type="button" class="link" @click="items = [...items, { ar: '', en: '' }]">{{ t('admin.sections.addItem') }}</button>
  </div>
</template>

<style scoped>
.list { display: flex; flex-direction: column; gap: 10px; }
.row { display: flex; gap: 8px; align-items: flex-end; }
.num {
  width: 24px; height: 24px; border-radius: 50%; background: var(--ink-900); color: var(--cream-100); font-size: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-bottom: 10px;
}
.grow { flex: 1; min-width: 0; }
.ctrls { display: flex; gap: 2px; margin-bottom: 8px; }
.ctrls button { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; }
.ctrls button:disabled { opacity: .3; cursor: default; }
.ctrls .del { color: var(--critical-500); font-size: 16px; }
.link { align-self: flex-start; background: none; border: none; padding: 0; color: var(--text-accent); cursor: pointer; font-weight: 600; }
</style>
