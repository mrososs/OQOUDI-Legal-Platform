<script setup lang="ts">
import type { Localized } from '#shared/domain/localized'

type Faq = { q: Localized, a: Localized }

/** Question/answer pairs for a service FAQ section. */
const faqs = defineModel<Faq[]>({ required: true })
const { t } = useI18n()

function update(i: number, patch: Partial<Faq>) {
  faqs.value = faqs.value.map((x, j) => (j === i ? { ...x, ...patch } : x))
}
</script>

<template>
  <div class="list">
    <div v-for="(item, i) in faqs" :key="i" class="pair">
      <AdminLocalizedInput :model-value="item.q" :label="t('admin.sections.question')" compact @update:model-value="v => update(i, { q: v })" />
      <AdminLocalizedInput :model-value="item.a" :label="t('admin.sections.answer')" compact multiline :rows="2" @update:model-value="v => update(i, { a: v })" />
      <button type="button" class="del" @click="faqs = faqs.filter((_, j) => j !== i)">{{ t('admin.sections.removeQuestion') }}</button>
    </div>
    <button type="button" class="link" @click="faqs = [...faqs, { q: { ar: '', en: '' }, a: { ar: '', en: '' } }]">{{ t('admin.sections.addQuestion') }}</button>
  </div>
</template>

<style scoped>
.list { display: flex; flex-direction: column; gap: 12px; }
.pair { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--border-subtle); border-radius: 12px; }
.del { align-self: flex-start; background: none; border: none; padding: 0; color: var(--critical-500); cursor: pointer; font-size: 13px; }
.link { align-self: flex-start; background: none; border: none; padding: 0; color: var(--text-accent); cursor: pointer; font-weight: 600; }
</style>
