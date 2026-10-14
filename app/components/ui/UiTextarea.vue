<script setup lang="ts">
const model = defineModel<string | null>()

const props = withDefaults(defineProps<{
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  required?: boolean
  rows?: number
  maxlength?: number
  disabled?: boolean
  id?: string
}>(), { rows: 5 })

const autoId = useId()
const fieldId = computed(() => props.id ?? autoId)
const hintId = computed(() => `${fieldId.value}-hint`)
const message = computed(() => props.error || props.hint)
</script>

<template>
  <div class="kh-field">
    <label v-if="label" class="kh-field__label" :for="fieldId">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>
    <textarea
      :id="fieldId"
      v-model="model"
      class="kh-input"
      :class="{ 'kh-input--error': !!error }"
      :rows="rows"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :disabled="disabled"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="message ? hintId : undefined"
    />
    <span
      v-if="message"
      :id="hintId"
      class="kh-field__hint"
      :class="{ 'kh-field__hint--error': !!error }"
    >{{ message }}</span>
  </div>
</template>
