<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  variant?: Variant
  size?: Size
  block?: boolean
  disabled?: boolean
  loading?: boolean
  /** Internal route: rendered as a locale-aware link. */
  to?: RouteLocationRaw
  /** External or non-localized URL. */
  href?: string
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
})

const classes = computed(() => [
  'kh-btn',
  `kh-btn--${props.variant}`,
  props.size !== 'md' && `kh-btn--${props.size}`,
  props.block && 'kh-btn--block',
])
const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <NuxtLinkLocale v-if="to && !isDisabled" :to="(to as never)" :class="classes">
    <slot />
  </NuxtLinkLocale>
  <a v-else-if="href && !isDisabled" :href="href" :class="classes">
    <slot />
  </a>
  <button
    v-else
    :type="type"
    :class="classes"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-inline-end-color: transparent;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
