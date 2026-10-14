<script setup lang="ts">
import { DISPLAY_ONLY_TYPES, formFieldsSchema, type FieldType, type FormField } from '#shared/domain/formSchema'
import type { PillNavItem } from '~/components/ui/UiPillNav.vue'

/** Tab 4 — request form builder. Fields are saved as a draft version; publishing creates a new immutable version. */
const fields = defineModel<FormField[]>({ required: true })
const props = defineProps<{
  serviceTitle: string
  publishedVersion: number | null
  hasDraft: boolean
  canDiscard: boolean
  busy: boolean
}>()
const emit = defineEmits<{ discard: [] }>()

const { t } = useI18n()
const f = useFormat()

const GLYPHS: Record<FieldType, string> = {
  text: 'Aa', textarea: '¶', select: '▾', radio: '◉', checkbox: '☑', multiselect: '⁘',
  number: '#', date: '◷', file: '⇪', section: 'H', help: 'i',
}
const PALETTE_ORDER: FieldType[] = ['text', 'textarea', 'select', 'radio', 'checkbox', 'multiselect', 'number', 'date', 'file', 'section', 'help']

const mode = shallowRef<'build' | 'preview'>('build')
const modeTabs = computed<PillNavItem[]>(() => [
  { id: 'build', label: t('admin.form.build') },
  { id: 'preview', label: t('admin.form.preview') },
])
const selectedId = shallowRef<string | null>(fields.value[0]?.id ?? null)
const selectedIndex = computed(() => fields.value.findIndex(x => x.id === selectedId.value))

const inputCount = computed(() => fields.value.filter(x => !DISPLAY_ONLY_TYPES.includes(x.type)).length)
const schemaError = computed(() => {
  if (!fields.value.length) return ''
  const res = formFieldsSchema.safeParse(fields.value)
  return res.success ? '' : t('admin.form.invalid')
})

function newId(type: FieldType): string {
  const used = new Set(fields.value.map(x => x.id))
  let n = 1
  while (used.has(`${type}_${n}`)) n++
  return `${type}_${n}`
}

function makeField(type: FieldType): FormField {
  const base: FormField = { id: newId(type), type, label: { ar: t(`admin.fieldTypes.${type}`), en: '' } }
  if (['select', 'radio', 'checkbox', 'multiselect'].includes(type)) {
    base.options = [
      { value: 'opt_1', label: { ar: `${t('admin.form.option')} ١`, en: 'Option 1' } },
      { value: 'opt_2', label: { ar: `${t('admin.form.option')} ٢`, en: 'Option 2' } },
    ]
  }
  if (type === 'file') Object.assign(base, { accept: ['pdf', 'docx', 'jpg', 'png'], maxSizeMb: 10, maxFiles: 5 })
  return base
}

function add(type: FieldType) {
  const field = makeField(type)
  const at = selectedIndex.value >= 0 ? selectedIndex.value + 1 : fields.value.length
  const next = [...fields.value]
  next.splice(at, 0, field)
  fields.value = next
  selectedId.value = field.id
  mode.value = 'build'
}

function move(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= fields.value.length) return
  const next = [...fields.value]
  ;[next[i], next[j]] = [next[j]!, next[i]!]
  fields.value = next
}

function duplicate(i: number) {
  const src = fields.value[i]!
  const copy = { ...structuredClone(toRaw(src)), id: newId(src.type) }
  const next = [...fields.value]
  next.splice(i + 1, 0, copy)
  fields.value = next
  selectedId.value = copy.id
}

function remove(i: number) {
  const removed = fields.value[i]
  fields.value = fields.value.filter((_, j) => j !== i)
  if (removed?.id === selectedId.value) selectedId.value = fields.value[Math.max(0, i - 1)]?.id ?? null
}

function updateSelected(field: FormField) {
  fields.value = fields.value.map((x, j) => (j === selectedIndex.value ? field : x))
}

function meta(field: FormField): string {
  if (field.options?.length) return ` · ${t('admin.form.optionsCount', { n: f.number(field.options.length) })}`
  if (field.minLength) return ` · ${t('admin.form.minChars', { n: f.number(field.minLength) })}`
  return ''
}
</script>

<template>
  <div class="builder">
    <section class="kh-card palette">
      <h2 class="h">{{ t('admin.form.fieldTypes') }}</h2>
      <span class="muted small">{{ t('admin.form.paletteHint') }}</span>
      <button v-for="type in PALETTE_ORDER" :key="type" type="button" class="pal" @click="add(type)">
        <span class="glyph" aria-hidden="true">{{ GLYPHS[type] }}</span>{{ t(`admin.fieldTypes.${type}`) }}
      </button>
    </section>

    <section class="kh-card canvas">
      <div class="canvas-head">
        <h2 class="h">
          {{ t('admin.form.formOf', { name: serviceTitle }) }}
          <span class="muted count">· {{ t('admin.form.fieldsCount', { n: f.number(inputCount) }) }}</span>
        </h2>
        <UiPillNav :items="modeTabs" :active-id="mode" :aria-label="t('admin.form.mode')" @select="id => (mode = id as 'build' | 'preview')" />
      </div>
      <div class="status-row">
        <UiBadge :tone="publishedVersion ? 'positive' : 'neutral'">
          {{ publishedVersion ? t('admin.form.publishedVersion', { n: f.number(publishedVersion) }) : t('admin.form.noPublished') }}
        </UiBadge>
        <UiBadge v-if="hasDraft" tone="caution">{{ t('admin.form.draftPending') }}</UiBadge>
        <button v-if="canDiscard" type="button" class="link small" :disabled="busy" @click="emit('discard')">{{ t('admin.form.discardDraft') }}</button>
      </div>
      <UiAlert v-if="schemaError">{{ schemaError }}</UiAlert>

      <div v-if="mode === 'build'" class="list">
        <div v-if="!fields.length" class="empty">{{ t('admin.form.empty') }}</div>
        <div
          v-for="(field, i) in fields"
          :key="field.id"
          class="item"
          :class="{ selected: field.id === selectedId, section: field.type === 'section' }"
        >
          <span class="glyph" aria-hidden="true">{{ GLYPHS[field.type] }}</span>
          <button type="button" class="item-main" :aria-pressed="field.id === selectedId" @click="selectedId = field.id">
            <span class="item-label">{{ f.text(field.label) || '—' }} <span v-if="field.required" class="req">*</span></span>
            <span class="item-meta">{{ t(`admin.fieldTypes.${field.type}`) }}{{ meta(field) }}</span>
          </button>
          <button type="button" class="ic" :aria-label="t('admin.common.up')" :disabled="i === 0" @click="move(i, -1)">▲</button>
          <button type="button" class="ic" :aria-label="t('admin.common.down')" :disabled="i === fields.length - 1" @click="move(i, 1)">▼</button>
          <button type="button" class="ic" :aria-label="t('admin.form.duplicate')" @click="duplicate(i)">⧉</button>
          <button type="button" class="ic del" :aria-label="t('admin.common.remove')" @click="remove(i)">×</button>
        </div>
      </div>
      <AdminFormPreview v-else :fields="fields" />
    </section>

    <section class="kh-card settings">
      <h2 class="h">{{ t('admin.form.fieldSettings') }}</h2>
      <AdminFieldEditor v-if="selectedIndex >= 0" :key="selectedId!" :model-value="fields[selectedIndex]!" @update:model-value="updateSelected" />
      <span v-else class="muted">{{ t('admin.form.selectField') }}</span>
    </section>
  </div>
  <div class="note">{{ t('admin.form.versionNote', { n: f.number((props.publishedVersion ?? 0) + 1) }) }}</div>
</template>

<style scoped>
.builder { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
.h { font-size: 15px; font-weight: 700; margin: 0; }
.small { font-size: 12px; }
.palette { flex: 0 1 200px; min-width: 180px; display: flex; flex-direction: column; gap: 6px; padding: 16px; }
.pal {
  display: flex; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-subtle);
  background: #fff; font-size: 13px; cursor: pointer; text-align: start; color: var(--text-strong);
}
.pal:hover { border-color: var(--gold-400); }
.glyph {
  width: 24px; height: 24px; border-radius: 6px; background: var(--gold-50); color: var(--gold-700); font-size: 11px;
  font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.canvas { flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 10px; padding: 16px; }
.canvas-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.count { font-weight: 400; font-size: 12px; }
.status-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.list { display: flex; flex-direction: column; gap: 6px; min-height: 200px; }
.empty { border: 1.5px dashed var(--border-default); border-radius: 12px; padding: 40px; text-align: center; color: var(--text-muted); }
.item {
  display: flex; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 10px;
  border: 1.5px solid var(--border-subtle); background: #fff;
}
.item.section { background: var(--neutral-100); }
.item.selected { border-color: var(--ink-900); background: var(--gold-50); }
.item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; background: none; border: none; text-align: start; cursor: pointer; padding: 2px 0; }
.item-label { font-weight: 600; color: var(--text-strong); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.section .item-label { font-weight: 800; }
.req { color: var(--critical-500); }
.item-meta { font-size: 11px; color: var(--text-muted); }
.ic { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; }
.ic:disabled { opacity: .3; cursor: default; }
.ic.del { color: var(--critical-500); font-size: 16px; }
.settings { flex: 1 1 300px; max-width: 100%; display: flex; flex-direction: column; gap: 12px; padding: 16px; }
.link { background: none; border: none; padding: 0; color: var(--text-accent); cursor: pointer; }
.note { background: var(--neutral-100); border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-top: 12px; }
</style>
