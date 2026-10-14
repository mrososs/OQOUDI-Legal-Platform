<script setup lang="ts">
const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="toaster" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.tone}`"
        role="status"
        @click="dismiss(t.id)"
      >
        {{ t.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toaster {
  position: fixed;
  bottom: 20px;
  inset-inline: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 80;
  pointer-events: none;
  padding: 0 16px;
}
.toast {
  pointer-events: auto;
  background: var(--ink-900);
  color: var(--cream-100);
  padding: 12px 18px;
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  font-size: 14px;
  font-weight: 600;
  max-width: 520px;
  cursor: pointer;
}
.toast--critical { background: var(--critical-500); color: #fff; }
.toast-enter-active, .toast-leave-active { transition: all var(--duration-normal) var(--ease-standard); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
