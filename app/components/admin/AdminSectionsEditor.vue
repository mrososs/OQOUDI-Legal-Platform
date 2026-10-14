<script setup lang="ts">
import { LIST_SECTIONS } from '#shared/domain/serviceSections'
import type { SectionDraft, ServiceDraft } from '~/composables/useServiceEditor'

/** Tab 3 — which page sections show, their order and content. */
const draft = defineModel<ServiceDraft>({ required: true })
const { t } = useI18n()

const selectedKey = shallowRef(draft.value.sections[0]?.key ?? 'about')
const selected = computed(() => draft.value.sections.find(s => s.key === selectedKey.value))
const isList = computed(() => !!selected.value && (LIST_SECTIONS.includes(selected.value.key) || selected.value.key === 'steps'))
const isDerived = computed(() => !!selected.value && ['duration', 'pricing', 'reviews'].includes(selected.value.key))

function setSections(sections: SectionDraft[]) {
  draft.value = { ...draft.value, sections }
}
function update(key: string, patch: Partial<SectionDraft>) {
  setSections(draft.value.sections.map(s => (s.key === key ? { ...s, ...patch } : s)))
}
function move(i: number, dir: -1 | 1) {
  const j = i + dir
  const list = [...draft.value.sections]
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j]!, list[i]!]
  setSections(list)
}
</script>

<template>
  <div class="layout">
    <section class="kh-card list-card">
      <h2 class="h">{{ t('admin.sections.title') }}</h2>
      <p class="muted small">{{ t('admin.sections.lead') }}</p>
      <div
        v-for="(s, i) in draft.sections"
        :key="s.key"
        class="row"
        :class="{ selected: s.key === selectedKey, off: !s.isEnabled }"
      >
        <button type="button" class="pick" :aria-pressed="s.key === selectedKey" @click="selectedKey = s.key">
          {{ t(`sections.${s.key}`) }}
        </button>
        <button type="button" class="arrow" :aria-label="t('admin.common.up')" :disabled="i === 0" @click="move(i, -1)">▲</button>
        <button type="button" class="arrow" :aria-label="t('admin.common.down')" :disabled="i === draft.sections.length - 1" @click="move(i, 1)">▼</button>
        <AdminSwitch
          :model-value="s.isEnabled"
          :aria-label="t('admin.sections.toggle', { name: t(`sections.${s.key}`) })"
          @update:model-value="v => update(s.key, { isEnabled: v })"
        />
      </div>
    </section>

    <section v-if="selected" class="kh-card content-card">
      <h2 class="h">{{ t('admin.sections.contentOf', { name: t(`sections.${selected.key}`) }) }}</h2>
      <p v-if="!selected.isEnabled" class="hidden-note">{{ t('admin.sections.hiddenNote') }}</p>
      <AdminLocalizedInput
        v-if="selected.key === 'about'"
        :model-value="selected.text"
        :label="t('admin.sections.paragraph')"
        multiline
        :rows="8"
        @update:model-value="v => update(selected!.key, { text: v })"
      />
      <AdminListItemsEditor
        v-else-if="isList"
        :model-value="selected.items"
        @update:model-value="v => update(selected!.key, { items: v })"
      />
      <AdminFaqItemsEditor
        v-else-if="selected.key === 'faq'"
        :model-value="selected.faqs"
        @update:model-value="v => update(selected!.key, { faqs: v })"
      />
      <div v-else-if="isDerived" class="auto">{{ t(`admin.sections.auto.${selected.key}`) }}</div>
    </section>
  </div>
</template>

<style scoped>
.layout { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
.list-card { flex: 1 1 340px; display: flex; flex-direction: column; gap: 6px; }
.content-card { flex: 1 1 440px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.h { font-size: 16px; font-weight: 700; margin: 0; }
.small { font-size: 13px; margin: 0 0 6px; }
.row {
  display: flex; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 10px;
  border: 1.5px solid var(--border-subtle); background: #fff;
}
.row.selected { border-color: var(--ink-900); background: var(--gold-50); }
.row.off .pick { color: var(--text-muted); }
.pick { flex: 1; text-align: start; background: none; border: none; font-weight: 600; color: var(--text-strong); cursor: pointer; padding: 4px 0; }
.arrow { background: none; border: none; cursor: pointer; color: var(--text-muted); }
.arrow:disabled { opacity: .3; cursor: default; }
.hidden-note { margin: 0; font-size: 13px; background: var(--caution-100); color: var(--caution-500); border-radius: 10px; padding: 8px 12px; }
.auto { background: var(--neutral-100); border-radius: 10px; padding: 14px; font-size: 13px; line-height: 1.7; }
</style>
