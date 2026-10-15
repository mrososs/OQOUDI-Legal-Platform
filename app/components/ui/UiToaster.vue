<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from '@lucide/vue'
import type { ToastItem, ToastType } from '~/composables/useToast'

/** Renders the global toast queue (see useToast). Mounted once in app.vue. */
const { toasts, dismiss, pause, resume } = useToastQueue()
const { t } = useI18n()

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info, loading: Loader2 } as const
const politeToasts = computed(() => toasts.value.filter(x => x.type !== 'error'))
const alertToasts = computed(() => toasts.value.filter(x => x.type === 'error'))

function label(type: ToastType) {
  return t(`toast.types.${type}`)
}

function runAction(item: ToastItem) {
  item.action?.onClick()
  dismiss(item.id)
}
</script>

<template>
  <div class="toaster">
    <!-- Two live regions: errors interrupt (assertive), everything else is polite. -->
    <TransitionGroup tag="div" name="toast" class="stack" role="region" aria-live="assertive" aria-relevant="additions" :aria-label="t('toast.region')">
      <div
        v-for="item in alertToasts"
        :key="item.id"
        class="toast toast--error"
        role="alert"
        @mouseenter="pause(item.id)"
        @mouseleave="resume(item.id)"
        @focusin="pause(item.id)"
        @focusout="resume(item.id)"
      >
        <UiToastBody :item="item" :icon="ICONS[item.type]" :type-label="label(item.type)" @dismiss="dismiss(item.id)" @action="runAction(item)" />
      </div>
    </TransitionGroup>
    <TransitionGroup tag="div" name="toast" class="stack" aria-live="polite" aria-relevant="additions text">
      <div
        v-for="item in politeToasts"
        :key="item.id"
        class="toast"
        :class="`toast--${item.type}`"
        role="status"
        @mouseenter="pause(item.id)"
        @mouseleave="resume(item.id)"
        @focusin="pause(item.id)"
        @focusout="resume(item.id)"
      >
        <UiToastBody :item="item" :icon="ICONS[item.type]" :type-label="label(item.type)" @dismiss="dismiss(item.id)" @action="runAction(item)" />
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toaster {
  position: fixed;
  bottom: 20px;
  inset-inline-end: 20px;
  z-index: 90;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(400px, calc(100vw - 32px));
  pointer-events: none;
}
.stack { display: flex; flex-direction: column; gap: 10px; }
.toast {
  --toast-accent: var(--ink-900);
  --toast-soft: var(--neutral-100);
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  border-inline-start: 4px solid var(--toast-accent);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  color: var(--text-body);
}
.toast--success { --toast-accent: var(--positive-500); --toast-soft: var(--positive-100); }
.toast--error { --toast-accent: var(--critical-500); --toast-soft: var(--critical-100); }
.toast--warning { --toast-accent: var(--caution-500); --toast-soft: var(--caution-100); }
.toast--info { --toast-accent: var(--info-500); --toast-soft: var(--info-100); }
.toast--loading { --toast-accent: var(--gold-500); --toast-soft: var(--gold-50); }

.toast-move,
.toast-enter-active,
.toast-leave-active { transition: transform var(--duration-normal) var(--ease-standard), opacity var(--duration-normal) var(--ease-standard); }
.toast-leave-active { position: absolute; inset-inline: 0; }
.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateX(calc(24px * var(--dir-sign, 1))); }
.toast:hover :deep(.timer),
.toast:focus-within :deep(.timer) { animation-play-state: paused; }


@media (max-width: 640px) {
  .toaster { inset-inline: 16px; bottom: 16px; width: auto; }
  .toast-enter-from,
  .toast-leave-to { transform: translateY(16px); }
}
@media (prefers-reduced-motion: reduce) {
  .toast-move, .toast-enter-active, .toast-leave-active { transition: opacity var(--duration-fast) linear; }
  .toast-enter-from, .toast-leave-to { transform: none; }
}
</style>
