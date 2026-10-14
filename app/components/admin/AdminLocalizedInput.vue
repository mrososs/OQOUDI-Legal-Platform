<script setup lang="ts">
import type { Localized } from '#shared/domain/localized'

/** Arabic (required) + English (optional) pair of inputs for jsonb {ar, en} content. */
const model = defineModel<Localized>({ required: true })

withDefaults(defineProps<{
  label: string
  multiline?: boolean
  rows?: number
  required?: boolean
  error?: string
  placeholder?: string
  compact?: boolean
}>(), { rows: 3 })

const { t } = useI18n()
const id = useId()

function set(lang: 'ar' | 'en', value: string) {
  model.value = { ...model.value, [lang]: value }
}
</script>

<template>
  <fieldset class="loc" :class="{ compact }">
    <legend v-if="!compact" class="kh-field__label legend">{{ label }}<span v-if="required" aria-hidden="true"> *</span></legend>
    <div class="pair">
      <div class="kh-field">
        <label :for="`${id}-ar`" class="sub">{{ compact ? `${label} · ` : '' }}{{ t('admin.common.arabic') }}</label>
        <textarea
          v-if="multiline"
          :id="`${id}-ar`"
          class="kh-input"
          :class="{ 'kh-input--error': !!error }"
          :rows="rows"
          dir="rtl"
          :placeholder="placeholder"
          :value="model.ar"
          @input="set('ar', ($event.target as HTMLTextAreaElement).value)"
        />
        <input
          v-else
          :id="`${id}-ar`"
          class="kh-input"
          :class="{ 'kh-input--error': !!error }"
          dir="rtl"
          :placeholder="placeholder"
          :value="model.ar"
          @input="set('ar', ($event.target as HTMLInputElement).value)"
        >
      </div>
      <div class="kh-field">
        <label :for="`${id}-en`" class="sub">{{ t('admin.common.english') }}</label>
        <textarea
          v-if="multiline"
          :id="`${id}-en`"
          class="kh-input"
          :rows="rows"
          dir="ltr"
          :value="model.en ?? ''"
          @input="set('en', ($event.target as HTMLTextAreaElement).value)"
        />
        <input
          v-else
          :id="`${id}-en`"
          class="kh-input"
          dir="ltr"
          :value="model.en ?? ''"
          @input="set('en', ($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>
    <span v-if="error" class="kh-field__hint kh-field__hint--error" role="alert">{{ error }}</span>
  </fieldset>
</template>

<style scoped>
.loc { border: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.legend { padding: 0; margin-bottom: 4px; }
.pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 8px; }
.sub { font-size: 12px; color: var(--text-muted); }
.compact .pair { gap: 6px; }
.compact .kh-input { padding: 0.5rem 0.75rem; }
</style>
