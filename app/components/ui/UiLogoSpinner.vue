<script setup lang="ts">
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  /** Preset or exact pixel size. */
  size?: Size | number
  /** Accessible name; defaults to the translated "Loading…". Ignored when `decorative`. */
  label?: string
  /** Hide from assistive tech when a surrounding live region already announces the loading state. */
  decorative?: boolean
}>(), { size: 'md' })

const { t } = useI18n()

const SIZES: Record<Size, number> = { sm: 40, md: 72, lg: 112 }
const px = computed(() => (typeof props.size === 'number' ? props.size : SIZES[props.size]))
</script>

<template>
  <span
    class="logo-spinner"
    :style="{ '--size': `${px}px` }"
    :role="decorative ? undefined : 'status'"
    :aria-label="decorative ? undefined : (label ?? t('common.loading'))"
    :aria-hidden="decorative || undefined"
  >
    <svg class="ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle class="track" cx="50" cy="50" r="46" />
      <circle class="arc" cx="50" cy="50" r="46" />
    </svg>
    <img class="mark" src="/brand/oqoudi-mark.png" alt="" width="413" height="352" draggable="false">
  </span>
</template>

<style scoped>
.logo-spinner {
  display: inline-grid;
  place-items: center;
  width: var(--size);
  height: var(--size);
  flex-shrink: 0;
}
.ring,
.mark { grid-area: 1 / 1; }
.ring {
  width: 100%;
  height: 100%;
  fill: none;
  stroke-width: 3.5;
  animation: oq-spin 1.1s linear infinite;
}
.track { stroke: var(--gold-100); }
.arc {
  stroke: var(--gold-500);
  stroke-linecap: round;
  /* Circumference of r=46 is ~289: a quarter-ish arc chasing round the track. */
  stroke-dasharray: 78 211;
}
.mark {
  width: 58%;
  height: auto;
  user-select: none;
  animation: oq-breathe 1.6s ease-in-out infinite;
}

@keyframes oq-spin { to { transform: rotate(360deg); } }
@keyframes oq-breathe {
  0%, 100% { opacity: .68; transform: scale(.95); }
  50% { opacity: 1; transform: scale(1); }
}
@keyframes oq-fade { 0%, 100% { opacity: .6; } 50% { opacity: 1; } }

/* Reduced motion: no rotation or scaling, only a slow fade so it still reads as "working". */
@media (prefers-reduced-motion: reduce) {
  .ring { animation: none !important; }
  .mark { animation: oq-fade 2s ease-in-out infinite !important; animation-duration: 2s !important; }
}
</style>
