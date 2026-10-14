<script setup lang="ts">
const model = defineModel<string | number | null>()

const props = defineProps<{
  label?: string
  hint?: string
  error?: string
  required?: boolean
  type?: string
  placeholder?: string
  autocomplete?: string
  inputmode?: 'text' | 'numeric' | 'tel' | 'email' | 'decimal' | 'search' | 'url'
  dir?: 'ltr' | 'rtl' | 'auto'
  disabled?: boolean
  min?: number | string
  max?: number | string
  maxlength?: number
  id?: string
}>()

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
    <input
      :id="fieldId"
      v-model="model"
      class="kh-input"
      :class="{ 'kh-input--error': !!error }"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :dir="dir"
      :disabled="disabled"
      :min="min"
      :max="max"
      :maxlength="maxlength"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="message ? hintId : undefined"
    >
    <span
      v-if="message"
      :id="hintId"
      class="kh-field__hint"
      :class="{ 'kh-field__hint--error': !!error }"
      :role="error ? 'alert' : undefined"
    >{{ message }}</span>
  </div>
</template>
