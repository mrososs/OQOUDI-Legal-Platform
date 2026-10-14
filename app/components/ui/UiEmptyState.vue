<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="kh-card empty">
    <div class="title">{{ title }}</div>
    <p v-if="description" class="desc">{{ description }}</p>
    <div v-if="$slots.default" class="actions"><slot /></div>
  </div>
</template>

<style scoped>
.empty { text-align: center; padding: 56px 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.title { font-family: var(--font-heading); font-size: 20px; font-weight: 700; color: var(--text-strong); }
.desc { margin: 0; color: var(--text-muted); max-width: 520px; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
</style>
