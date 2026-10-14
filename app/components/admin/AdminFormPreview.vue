<script setup lang="ts">
import { Upload } from '@lucide/vue'
import { validateAnswers, type Answers, type FieldError, type FormField } from '#shared/domain/formSchema'
import { acceptedExtensionsFor } from '#shared/domain/uploads'

/**
 * Live preview of the form as customers will see it, with the same
 * validation rules. File fields are shown as a non-functional dropzone
 * (no uploads happen from the editor).
 */
const props = defineProps<{ fields: FormField[] }>()
const { t } = useI18n()
const f = useFormat()

const answers = ref<Answers>({})
const errors = ref<Record<string, FieldError>>({})
const result = shallowRef('')

function test() {
  const res = validateAnswers(props.fields.filter(x => x.type !== 'file' || x.required), answers.value)
  // Required file fields cannot be filled in the preview: report them separately.
  const fileErrors = Object.fromEntries(Object.entries(res.errors).filter(([id]) => props.fields.find(x => x.id === id)?.type === 'file'))
  errors.value = res.errors
  const n = Object.keys(res.errors).length - Object.keys(fileErrors).length
  result.value = n ? t('admin.form.previewErrors', { n: f.number(n) }) : t('admin.form.previewOk')
}

function setAnswer(id: string, v: Answers[string]) {
  answers.value = { ...answers.value, [id]: v }
  if (errors.value[id]) {
    const { [id]: _drop, ...rest } = errors.value
    errors.value = rest
  }
}
</script>

<template>
  <div class="frame">
    <div class="paper">
      <template v-for="field in fields" :key="field.id">
        <div v-if="field.type === 'file'" class="kh-field">
          <span class="kh-field__label">{{ f.text(field.label) }}<span v-if="field.required" aria-hidden="true"> *</span></span>
          <div class="fake-zone">
            <Upload :size="20" aria-hidden="true" />
            <span>{{ t('upload.limits', { types: acceptedExtensionsFor(field.accept).map(x => x.toUpperCase()).join('، '), max: f.number(field.maxSizeMb ?? 10) }) }}</span>
          </div>
        </div>
        <FormsDynamicField
          v-else
          :field="field"
          :value="answers[field.id]"
          :error="errors[field.id] ?? null"
          form-version-id=""
          @update:value="v => setAnswer(field.id, v)"
        />
      </template>
      <p v-if="!fields.length" class="muted">{{ t('admin.form.empty') }}</p>
      <div class="actions">
        <UiButton @click="test">{{ t('admin.form.testValidation') }}</UiButton>
        <span v-if="result" class="result" role="status">{{ result }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.frame { background: var(--neutral-100); border-radius: 12px; padding: 16px; }
.paper { background: #fff; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 16px; max-width: 620px; margin: 0 auto; }
.fake-zone {
  border: 1.5px dashed var(--border-default); border-radius: 12px; padding: 18px; text-align: center; font-size: 13px;
  color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.result { font-size: 13px; color: var(--text-accent); font-weight: 600; }
</style>
