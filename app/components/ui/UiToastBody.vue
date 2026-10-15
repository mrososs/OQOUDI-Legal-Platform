<script setup lang="ts">
import type { Component } from 'vue'
import { X } from '@lucide/vue'
import type { ToastItem } from '~/composables/useToast'

/** Content of one toast: icon, text, optional action, close button and timer bar. */
defineProps<{ item: ToastItem, icon: Component, typeLabel: string }>()
const emit = defineEmits<{ dismiss: [], action: [] }>()
const { t } = useI18n()
const f = useFormat()
</script>

<template>
  <div class="body">
    <span class="icon" :class="{ spin: item.type === 'loading' }" aria-hidden="true">
      <component :is="icon" :size="20" :stroke-width="2" />
    </span>
    <div class="text">
      <span class="sr-only">{{ typeLabel }}: </span>
      <strong v-if="item.title" class="title">{{ item.title }}</strong>
      <span class="message">{{ item.message }}</span>
      <span v-if="item.count > 1" class="count" :aria-label="t('toast.repeated', { n: item.count })">×{{ f.number(item.count) }}</span>
      <button v-if="item.action" type="button" class="action" @click="emit('action')">{{ item.action.label }}</button>
    </div>
    <button v-if="item.type !== 'loading'" type="button" class="close" :aria-label="t('toast.dismiss')" @click="emit('dismiss')">
      <X :size="16" :stroke-width="2" aria-hidden="true" />
    </button>
  </div>
  <span
    v-if="item.duration > 0"
    :key="item.version"
    class="timer"
    :style="{ animationDuration: `${item.duration}ms` }"
    aria-hidden="true"
  />
</template>

<style scoped>
.body { display: flex; gap: 12px; align-items: flex-start; padding: 14px 14px 14px 16px; }
.icon {
  flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--toast-soft); color: var(--toast-accent);
}
.spin :deep(svg) { animation: spin 1s linear infinite; }
.text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding-top: 5px; }
.title { font-family: var(--font-heading); font-size: 14px; color: var(--text-strong); }
.message { font-size: 14px; line-height: 1.6; color: var(--text-body); font-weight: 600; overflow-wrap: anywhere; }
.count { align-self: flex-start; font-size: 11px; font-weight: 700; color: var(--toast-accent); background: var(--toast-soft); border-radius: 999px; padding: 0 8px; }
.action {
  align-self: flex-start; margin-top: 6px; border: 0; background: none; padding: 0;
  font: inherit; font-size: 13px; font-weight: 700; color: var(--toast-accent); cursor: pointer; text-decoration: underline;
}
.close {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 8px; border: 0; background: transparent;
  color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
}
.close:hover { background: var(--neutral-100); color: var(--text-strong); }
.close:focus-visible, .action:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.timer {
  position: absolute; bottom: 0; inset-inline-start: 0; height: 3px; width: 100%;
  background: var(--toast-accent); opacity: 0.35; transform-origin: var(--dir-start, left) center;
  animation-name: shrink; animation-timing-function: linear; animation-fill-mode: forwards;
}
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@keyframes shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .timer { display: none; }
  .spin :deep(svg) { animation-duration: 3s; }
}
</style>
