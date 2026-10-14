<script setup lang="ts">
defineProps<{
  steps: string[]
  current: number
}>()
const f = useFormat()
</script>

<template>
  <ol class="stepper">
    <li v-for="(label, i) in steps" :key="label" class="step" :aria-current="i === current ? 'step' : undefined">
      <span class="num" :class="{ 'num--on': i <= current }">{{ i < current ? '✓' : f.number(i + 1) }}</span>
      <span class="label" :class="{ 'label--on': i === current }">{{ label }}</span>
      <span v-if="i < steps.length - 1" class="line" aria-hidden="true" />
    </li>
  </ol>
</template>

<style scoped>
.stepper { display: flex; align-items: center; margin: 0; padding: 0; list-style: none; flex-wrap: wrap; row-gap: 8px; }
.step { display: flex; align-items: center; gap: 8px; }
.num {
  width: 28px; height: 28px; border-radius: 50%; background: #fff; color: var(--text-muted);
  border: 1.5px solid var(--border-default); display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
}
.num--on { background: var(--ink-900); color: var(--cream-100); border-color: var(--ink-900); }
.label { font-size: 14px; font-weight: 500; color: var(--text-muted); }
.label--on { font-weight: 700; color: var(--text-strong); }
.line { width: 28px; height: 1px; background: var(--border-default); margin: 0 8px; }
</style>
