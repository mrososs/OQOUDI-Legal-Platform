<script setup lang="ts">
const props = defineProps<{ value: number }>()
const filled = computed(() => Math.max(0, Math.min(5, Math.round(props.value))))
</script>

<template>
  <span class="stars" role="img" :aria-label="$t('reviews.starsAria', { n: filled })">
    <span aria-hidden="true">{{ '★'.repeat(filled) }}{{ '☆'.repeat(5 - filled) }}</span>
  </span>
</template>

<style scoped>
.stars { color: var(--gold-400); letter-spacing: 2px; font-size: 16px; }
</style>
