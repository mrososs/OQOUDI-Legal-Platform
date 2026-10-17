<script setup lang="ts">
type Kind = 'individual' | 'company'

const model = defineModel<Kind>({ required: true })
defineProps<{ error?: string }>()

const { t } = useI18n()
const labelId = useId()
</script>

<template>
  <div class="kh-field">
    <span :id="labelId" class="kh-field__label">{{ t('auth.accountType') }}</span>
    <div class="kinds" role="radiogroup" :aria-labelledby="labelId">
      <button
        v-for="k in (['individual', 'company'] as const)"
        :key="k"
        type="button"
        role="radio"
        class="kind"
        :aria-checked="model === k"
        :data-kind="k"
        @click="model = k"
      >
        {{ t(`auth.kind.${k}`) }}
      </button>
    </div>
    <span v-if="error" class="kh-field__hint kh-field__hint--error" role="alert">{{ error }}</span>
  </div>
</template>

<style scoped>
.kinds { display: flex; gap: 8px; }
.kind {
  flex: 1; padding: 10px; border-radius: 10px; border: 1.5px solid var(--border-default); background: #fff;
  font-size: 14px; cursor: pointer; color: var(--text-strong);
}
.kind[aria-checked='true'] { border-color: var(--ink-900); background: var(--gold-50); }
</style>
