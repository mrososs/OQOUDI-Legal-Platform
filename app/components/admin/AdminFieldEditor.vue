<script setup lang="ts">
import type { Localized } from '#shared/domain/localized'
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_MB, type AllowedExtension } from '#shared/domain/uploads'
import { CHOICE_TYPES, DISPLAY_ONLY_TYPES, type FormField } from '#shared/domain/formSchema'

/** Settings panel of the selected form field. */
const field = defineModel<FormField>({ required: true })
const { t } = useI18n()

const isDisplay = computed(() => DISPLAY_ONLY_TYPES.includes(field.value.type))
const isChoice = computed(() => CHOICE_TYPES.includes(field.value.type))
const hasPlaceholder = computed(() => ['text', 'textarea', 'number', 'select'].includes(field.value.type))
const hasLength = computed(() => field.value.type === 'text' || field.value.type === 'textarea')
const labelCaption = computed(() =>
  field.value.type === 'help' ? t('admin.form.helpText') : field.value.type === 'section' ? t('admin.form.sectionTitle') : t('admin.form.fieldLabel'),
)

function patch(p: Partial<FormField>) {
  // Undefined props are dropped so the stored JSON stays minimal.
  const next = Object.fromEntries(Object.entries({ ...field.value, ...p }).filter(([, v]) => v !== undefined))
  field.value = next as FormField
}

const emptyL = (): Localized => ({ ar: '', en: '' })
const asLoc = (v: unknown) => (v as Localized | undefined) ?? emptyL()
/** Optional localized props are omitted when both languages are empty. */
function setOptionalLoc(key: 'help' | 'placeholder', v: Localized) {
  patch({ [key]: v.ar.trim() || (v.en ?? '').trim() ? v : undefined })
}

function numberOrUndef(v: unknown): number | undefined {
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function nextOptionValue(): string {
  const used = new Set((field.value.options ?? []).map(o => o.value))
  let n = (field.value.options?.length ?? 0) + 1
  while (used.has(`opt_${n}`)) n++
  return `opt_${n}`
}

function addOption() {
  patch({ options: [...(field.value.options ?? []), { value: nextOptionValue(), label: emptyL() }] })
}
function updateOption(i: number, label: Localized) {
  patch({ options: (field.value.options ?? []).map((o, j) => (j === i ? { ...o, label } : o)) })
}
function removeOption(i: number) {
  patch({ options: (field.value.options ?? []).filter((_, j) => j !== i) })
}

const accept = computed<AllowedExtension[]>(() => field.value.accept ?? ['pdf', 'docx', 'jpg', 'png'])
function toggleExt(ext: AllowedExtension) {
  const list = accept.value.includes(ext) ? accept.value.filter(x => x !== ext) : [...accept.value, ext]
  if (list.length) patch({ accept: list })
}
</script>

<template>
  <div class="editor">
    <div class="muted small">{{ t('admin.form.typeIs', { type: t(`admin.fieldTypes.${field.type}`) }) }} · <span class="ltr">{{ field.id }}</span></div>

    <AdminLocalizedInput
      :model-value="field.label"
      :label="labelCaption"
      :multiline="field.type === 'help'"
      required
      @update:model-value="v => patch({ label: v })"
    />
    <AdminLocalizedInput
      v-if="hasPlaceholder"
      :model-value="asLoc(field.placeholder)"
      :label="t('admin.form.placeholder')"
      @update:model-value="v => setOptionalLoc('placeholder', v)"
    />
    <AdminLocalizedInput
      v-if="field.type !== 'help'"
      :model-value="asLoc(field.help)"
      :label="field.type === 'section' ? t('admin.form.sectionHelp') : t('admin.form.help')"
      @update:model-value="v => setOptionalLoc('help', v)"
    />
    <AdminSwitch
      v-if="!isDisplay"
      :model-value="!!field.required"
      :label="t('admin.form.required')"
      @update:model-value="v => patch({ required: v || undefined })"
    />

    <div v-if="isChoice" class="options">
      <span class="kh-field__label">{{ t('admin.form.options') }}</span>
      <div v-for="(o, i) in field.options ?? []" :key="o.value" class="option">
        <div class="grow">
          <AdminLocalizedInput :model-value="o.label" :label="t('admin.form.option')" compact @update:model-value="v => updateOption(i, v)" />
        </div>
        <button type="button" class="del" :aria-label="t('admin.form.removeOption')" @click="removeOption(i)">×</button>
      </div>
      <button type="button" class="link" @click="addOption">{{ t('admin.form.addOption') }}</button>
    </div>

    <div v-if="hasLength" class="two">
      <UiInput :model-value="field.minLength ?? ''" :label="t('admin.form.minLength')" type="number" min="0" @update:model-value="v => patch({ minLength: numberOrUndef(v) })" />
      <UiInput :model-value="field.maxLength ?? ''" :label="t('admin.form.maxLength')" type="number" min="1" @update:model-value="v => patch({ maxLength: numberOrUndef(v) })" />
    </div>
    <div v-if="field.type === 'number'" class="two">
      <UiInput :model-value="field.min ?? ''" :label="t('admin.form.min')" type="number" @update:model-value="v => patch({ min: numberOrUndef(v) })" />
      <UiInput :model-value="field.max ?? ''" :label="t('admin.form.max')" type="number" @update:model-value="v => patch({ max: numberOrUndef(v) })" />
    </div>

    <template v-if="field.type === 'file'">
      <div class="kh-field">
        <span class="kh-field__label">{{ t('admin.form.accept') }}</span>
        <div class="exts">
          <button
            v-for="ext in ALLOWED_EXTENSIONS"
            :key="ext"
            type="button"
            class="ext"
            dir="ltr"
            :aria-pressed="accept.includes(ext)"
            @click="toggleExt(ext)"
          >
            {{ ext.toUpperCase() }}
          </button>
        </div>
      </div>
      <div class="two">
        <UiInput :model-value="field.maxSizeMb ?? 10" :label="t('admin.form.maxSize')" type="number" min="1" :max="MAX_UPLOAD_MB" @update:model-value="v => patch({ maxSizeMb: Math.min(MAX_UPLOAD_MB, Math.max(1, Math.trunc(Number(v) || 1))) })" />
        <UiInput :model-value="field.maxFiles ?? 5" :label="t('admin.form.maxFiles')" type="number" min="1" max="10" @update:model-value="v => patch({ maxFiles: Math.min(10, Math.max(1, Math.trunc(Number(v) || 1))) })" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.editor { display: flex; flex-direction: column; gap: 14px; }
.small { font-size: 12px; }
.options { display: flex; flex-direction: column; gap: 8px; }
.option { display: flex; gap: 6px; align-items: flex-end; }
.grow { flex: 1; min-width: 0; }
.del { background: none; border: none; font-size: 16px; cursor: pointer; color: var(--text-muted); margin-bottom: 8px; }
.link { align-self: flex-start; background: none; border: none; padding: 0; color: var(--text-accent); cursor: pointer; font-weight: 600; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.exts { display: flex; gap: 6px; flex-wrap: wrap; }
.ext {
  padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border-default); background: #fff;
  color: var(--text-body); font-size: 12px; cursor: pointer;
}
.ext[aria-pressed='true'] { background: var(--ink-900); color: var(--cream-100); border-color: var(--ink-900); }
</style>
