<script setup lang="ts">
import type { Answers, FieldError, FormField } from '#shared/domain/formSchema'
import type { UploadedFile } from '~/composables/useUpload'

/** Renders a published form version from its field schema. */
const answers = defineModel<Answers>('answers', { required: true })
const files = defineModel<Record<string, UploadedFile[]>>('files', { required: true })

const props = defineProps<{
  fields: FormField[]
  errors: Record<string, FieldError>
  formVersionId: string
}>()

/** Section headings become numbered steps when the form has several (contract forms). */
const stepNumbers = computed(() => {
  const sections = props.fields.filter(x => x.type === 'section')
  return sections.length > 1 ? new Map(sections.map((s, i) => [s.id, i + 1])) : new Map<string, number>()
})

const emit = defineEmits<{ touch: [fieldId: string] }>()

// Stable fallback so fields without files don't get a new array every render.
const noFiles: UploadedFile[] = []

function setAnswer(id: string, v: Answers[string]) {
  answers.value = { ...answers.value, [id]: v }
}
function setFiles(id: string, list: UploadedFile[]) {
  files.value = { ...files.value, [id]: list }
}
</script>

<template>
  <div class="kh-card form">
    <FormsDynamicField
      v-for="field in fields"
      :key="field.id"
      :field="field"
      :value="answers[field.id]"
      :files="files[field.id] ?? noFiles"
      :error="errors[field.id] ?? null"
      :form-version-id="formVersionId"
      :step="stepNumbers.get(field.id)"
      @update:value="v => setAnswer(field.id, v)"
      @update:files="list => setFiles(field.id, list)"
      @touch="id => emit('touch', id)"
    />
  </div>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 20px; }
</style>
