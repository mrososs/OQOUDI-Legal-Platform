<script setup lang="ts">
import { FLOW_INDEX, FLOW_STEPS, type OrderStatus } from '#shared/domain/orderStatus'

/** Full labelled progress stepper for order detail pages. */
const props = defineProps<{ status: OrderStatus }>()
const { t } = useI18n()
const f = useFormat()
const idx = computed(() => FLOW_INDEX[props.status])
</script>

<template>
  <ol v-if="idx >= 0" class="stepper">
    <li v-for="(s, i) in FLOW_STEPS" :key="s" class="step" :aria-current="i === idx ? 'step' : undefined">
      <span class="dot" :class="{ done: i < idx || status === 'completed', current: i === idx && status !== 'completed' }">
        {{ i < idx || status === 'completed' ? '✓' : f.number(i + 1) }}
      </span>
      <span class="label" :class="{ on: i === idx }">{{ t(`flow.${s}`) }}</span>
    </li>
  </ol>
</template>

<style scoped>
.stepper { display: grid; grid-template-columns: repeat(5, 1fr); margin: 0; padding: 0; list-style: none; position: relative; }
.step { display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; }
.step:not(:last-child)::after {
  content: ''; position: absolute; top: 14px; inset-inline-start: calc(50% + 18px); inset-inline-end: calc(-50% + 18px);
  height: 2px; background: var(--neutral-200);
}
.dot {
  width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid var(--border-default); background: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: var(--text-muted);
  position: relative; z-index: 1;
}
.dot.done { background: var(--ink-900); border-color: var(--ink-900); color: var(--cream-100); }
.dot.current { background: var(--gold-400); border-color: var(--gold-400); color: var(--ink-900); }
.label { font-size: 12px; color: var(--text-muted); text-align: center; }
.label.on { color: var(--text-strong); font-weight: 700; }
</style>
