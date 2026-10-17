<script setup lang="ts">
/**
 * The app-wide branded loader. Mounted once in app.vue and driven by useGlobalLoading:
 *  - overlay: a page navigation or a write — centred logo spinner on a veil; the veil only swallows
 *    clicks while a write is in flight, so a slow navigation can always be abandoned;
 *  - pill: a plain read — a small click-through chip that never covers the page.
 */
const { t } = useI18n()
const { state } = useGlobalLoading()
</script>

<template>
  <!-- Persistent live region: announcing text into an element that already exists is reliable. -->
  <div class="sr-only" role="status" aria-live="polite">{{ state.visible ? t('common.loading') : '' }}</div>
  <Transition name="loading">
    <div
      v-if="state.visible"
      class="loading"
      :class="state.overlay ? 'loading--overlay' : 'loading--pill'"
      :data-blocking="state.blocking || undefined"
      aria-hidden="true"
    >
      <div class="body">
        <UiLogoSpinner :size="state.overlay ? 'lg' : 'sm'" decorative />
        <span class="text">{{ t('common.loading') }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Above modals (60) and the payment review drawer (55), below toasts (90). */
.loading { position: fixed; z-index: 80; display: grid; pointer-events: none; }

.loading--overlay {
  inset: 0;
  place-items: center;
  background: color-mix(in srgb, var(--surface-page) 78%, transparent);
  backdrop-filter: blur(3px);
}
.loading--overlay[data-blocking] { pointer-events: auto; cursor: progress; }
.loading--overlay .body { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.loading--overlay .text { font-size: 14px; font-weight: 600; color: var(--text-muted); }

.loading--pill { inset-inline: 0; bottom: 20px; place-items: end center; }
.loading--pill .body {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  padding-inline: 8px 20px;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  box-shadow: var(--shadow-lg);
}
.loading--pill .text { font-size: 13px; font-weight: 600; color: var(--text-body); }

.loading-enter-active,
.loading-leave-active { transition: opacity var(--duration-normal) var(--ease-standard); }
.loading-enter-from,
.loading-leave-to { opacity: 0; }
</style>
