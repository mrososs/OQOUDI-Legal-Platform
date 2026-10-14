<script setup lang="ts">
withDefaults(defineProps<{ height?: number }>(), { height: 230 })
</script>

<template>
  <div class="kh-card skeleton" :style="{ height: `${height}px` }" aria-hidden="true">
    <div class="bar w40" />
    <div class="bar w70 tall" />
    <div class="bar w100 block" />
  </div>
</template>

<style scoped>
.skeleton { display: flex; flex-direction: column; gap: 12px; animation: dqpulse 1.2s ease-in-out infinite; }
.bar { height: 18px; border-radius: 6px; background: var(--neutral-200); }
.tall { height: 22px; }
.block { height: 40px; background: var(--neutral-100); }
.w40 { width: 40%; }
.w70 { width: 70%; }
.w100 { width: 100%; }
</style>
