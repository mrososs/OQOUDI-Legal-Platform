<script setup lang="ts">
export interface SelectOption {
  value: string
  label: string
}

const model = defineModel<string | null>()

const props = defineProps<{
  options: SelectOption[]
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  ariaLabel?: string
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
    <select
      :id="fieldId"
      v-model="model"
      class="kh-input"
      :class="{ 'kh-input--error': !!error }"
      :disabled="disabled"
      :required="required"
      :aria-label="label ? undefined : ariaLabel"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="message ? hintId : undefined"
    >
      <option v-if="placeholder !== undefined" value="">{{ placeholder }}</option>
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <span
      v-if="message"
      :id="hintId"
      class="kh-field__hint"
      :class="{ 'kh-field__hint--error': !!error }"
    >{{ message }}</span>
  </div>
</template>
