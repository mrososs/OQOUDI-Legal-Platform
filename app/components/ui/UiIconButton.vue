<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  size?: 'sm' | 'md'
  solid?: boolean
  disabled?: boolean
}>(), { size: 'md' })
</script>

<template>
  <button
    type="button"
    class="kh-iconbtn"
    :class="{ 'kh-iconbtn--sm': size === 'sm', 'kh-iconbtn--solid': solid }"
    :disabled="disabled"
    :aria-label="label"
    :title="label"
  >
    <slot />
  </button>
</template>
