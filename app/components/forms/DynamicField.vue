<script setup lang="ts">
import type { AnswerValue, FieldError, FormField } from '#shared/domain/formSchema'
import { acceptedExtensionsFor, DEFAULT_FIELD_MAX_MB, DEFAULT_MAX_FILES } from '#shared/domain/uploads'
import type { UploadedFile } from '~/composables/useUpload'

/** Renders one field of a published form version. */
const value = defineModel<AnswerValue>('value')
const files = defineModel<UploadedFile[]>('files', { default: () => [] })

const props = defineProps<{
  field: FormField
  error?: FieldError | null
  formVersionId: string
}>()

const emit = defineEmits<{ touch: [fieldId: string] }>()

const { t } = useI18n()
const f = useFormat()
const groupLabelId = useId()

const label = computed(() => f.text(props.field.label))
const help = computed(() => f.text(props.field.help as never))
const placeholder = computed(() => f.text(props.field.placeholder as never))
const options = computed(() => (props.field.options ?? []).map(o => ({ value: o.value, label: f.text(o.label) })))

const errorText = computed(() => {
  if (!props.error) return ''
  const params = Object.fromEntries(
    Object.entries(props.error.params ?? {}).map(([k, v]) => [k, typeof v === 'number' ? f.number(v) : v]),
  )
  return t(`formErrors.${props.error.code}`, params)
})

const textValue = computed({
  get: () => (value.value == null ? '' : String(value.value)),
  set: (v: string) => {
    value.value = v
    emit('touch', props.field.id)
  },
})

const selected = computed(() => (Array.isArray(value.value) ? value.value : []))

function pick(optionValue: string) {
  const type = props.field.type
  if (type === 'checkbox' || type === 'multiselect') {
    const list = selected.value.includes(optionValue)
      ? selected.value.filter(v => v !== optionValue)
      : [...selected.value, optionValue]
    value.value = list
  }
  else {
    value.value = optionValue
  }
  emit('touch', props.field.id)
}

// Sync on actual upload/remove only. A deep watcher on `files` re-fired for every
// field whenever the parent re-rendered with a fresh `[]`, looping forever in
// production builds (Vue's recursion guard exists only in dev).
function setFiles(list: UploadedFile[]) {
  files.value = list
  value.value = list.map(x => x.id)
  emit('touch', props.field.id)
}
</script>

<template>
  <!-- display-only -->
  <div v-if="field.type === 'section'" class="section">
    <h2 class="section-title-sm">{{ label }}</h2>
    <p v-if="help" class="section-help">{{ help }}</p>
  </div>
  <p v-else-if="field.type === 'help'" class="help-box">{{ label }}</p>

  <!-- inputs -->
  <UiInput
    v-else-if="field.type === 'text' || field.type === 'number' || field.type === 'date'"
    v-model="textValue"
    :label="label"
    :required="field.required"
    :type="field.type === 'text' ? 'text' : field.type"
    :placeholder="placeholder"
    :min="field.min"
    :max="field.max"
    :maxlength="field.maxLength"
    :inputmode="field.type === 'number' ? 'decimal' : undefined"
    :error="errorText"
    :hint="help"
  />
  <UiTextarea
    v-else-if="field.type === 'textarea'"
    v-model="textValue"
    :label="label"
    :required="field.required"
    :placeholder="placeholder"
    :maxlength="field.maxLength"
    :error="errorText"
    :hint="help"
  />
  <UiSelect
    v-else-if="field.type === 'select'"
    v-model="textValue"
    :label="label"
    :required="field.required"
    :options="options"
    :placeholder="placeholder || t('common.choose')"
    :error="errorText"
    :hint="help"
  />

  <!-- choice groups -->
  <div v-else-if="field.type === 'radio' || field.type === 'checkbox' || field.type === 'multiselect'" class="kh-field">
    <span :id="groupLabelId" class="kh-field__label">{{ label }}<span v-if="field.required" aria-hidden="true"> *</span></span>
    <div
      :role="field.type === 'radio' ? 'radiogroup' : 'group'"
      :aria-labelledby="groupLabelId"
      :class="field.type === 'checkbox' ? 'grid-options' : 'row-options'"
    >
      <template v-if="field.type === 'radio'">
        <button
          v-for="o in options"
          :key="o.value"
          type="button"
          role="radio"
          class="opt"
          :aria-checked="value === o.value"
          @click="pick(o.value)"
        >
          <span class="radio" aria-hidden="true"><span class="radio-dot" /></span>{{ o.label }}
        </button>
      </template>
      <template v-else-if="field.type === 'checkbox'">
        <button
          v-for="o in options"
          :key="o.value"
          type="button"
          role="checkbox"
          class="opt"
          :aria-checked="selected.includes(o.value)"
          @click="pick(o.value)"
        >
          <span class="box" aria-hidden="true">{{ selected.includes(o.value) ? '✓' : '' }}</span>{{ o.label }}
        </button>
      </template>
      <template v-else>
        <button
          v-for="o in options"
          :key="o.value"
          type="button"
          class="chip"
          :aria-pressed="selected.includes(o.value)"
          @click="pick(o.value)"
        >
          {{ o.label }}
        </button>
      </template>
    </div>
    <span v-if="errorText" class="kh-field__hint kh-field__hint--error" role="alert">{{ errorText }}</span>
    <span v-else-if="help" class="kh-field__hint">{{ help }}</span>
  </div>

  <FormsFileDropzone
    v-else-if="field.type === 'file'"
    :model-value="files"
    :label="label"
    :required="field.required"
    :target="{ purpose: 'form', formVersionId, fieldId: field.id }"
    :accept="acceptedExtensionsFor(field.accept)"
    :max-size-mb="field.maxSizeMb ?? DEFAULT_FIELD_MAX_MB"
    :max-files="field.maxFiles ?? DEFAULT_MAX_FILES"
    :error="errorText"
    :hint="help"
    @update:model-value="setFiles"
  />
</template>

<style scoped>
.section { padding-top: 8px; border-top: 1px solid var(--border-subtle); margin-top: 4px; }
.section-title-sm { font-size: 18px; font-weight: 700; margin: 12px 0 2px; }
.section-help { margin: 0; font-size: 13px; color: var(--text-muted); }
.help-box { margin: 0; font-size: 14px; color: var(--text-muted); background: var(--neutral-100); padding: 12px 14px; border-radius: 10px; }
.row-options { display: flex; gap: 8px; flex-wrap: wrap; }
.grid-options { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.opt {
  display: flex; gap: 10px; align-items: center; padding: 10px 14px; border-radius: 10px;
  border: 1.5px solid var(--border-default); background: #fff; font-size: 14px; color: var(--text-strong);
  cursor: pointer; text-align: start;
}
.opt[aria-checked='true'] { border-color: var(--ink-900); }
.radio {
  width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid var(--ink-900);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.radio-dot { width: 8px; height: 8px; border-radius: 50%; background: transparent; }
.opt[aria-checked='true'] .radio-dot { background: var(--ink-900); }
.box {
  width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid var(--ink-900); color: var(--cream-100);
  font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.opt[aria-checked='true'] .box { background: var(--ink-900); }
.chip {
  padding: 8px 16px; border-radius: 999px; border: 1.5px solid var(--border-default); background: #fff;
  color: var(--text-body); font-size: 14px; cursor: pointer;
}
.chip[aria-pressed='true'] { border-color: var(--ink-900); background: var(--ink-900); color: var(--cream-100); }
</style>
