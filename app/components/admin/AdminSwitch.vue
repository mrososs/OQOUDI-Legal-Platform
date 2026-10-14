<script setup lang="ts">
/** Accessible on/off switch (prototype toggle style). */
const on = defineModel<boolean>({ required: true })
defineProps<{ label?: string, ariaLabel?: string, disabled?: boolean }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    class="switch-row"
    :aria-checked="on"
    :aria-label="label ? undefined : ariaLabel"
    :disabled="disabled"
    @click="on = !on"
  >
    <span class="track" :class="{ on }"><span class="thumb" /></span>
    <span v-if="label">{{ label }}</span>
  </button>
</template>

<style scoped>
.switch-row {
  display: inline-flex; gap: 10px; align-items: center; background: none; border: none; padding: 0;
  cursor: pointer; color: var(--text-strong); font-size: 14px;
}
.switch-row:disabled { opacity: .5; cursor: not-allowed; }
.track {
  width: 38px; height: 22px; border-radius: 999px; background: var(--neutral-300); position: relative;
  transition: background var(--duration-normal) var(--ease-standard); flex-shrink: 0;
}
.track.on { background: var(--ink-900); }
.thumb {
  position: absolute; top: 3px; inset-inline-start: 3px; width: 16px; height: 16px; border-radius: 50%;
  background: #fff; transition: inset-inline-start var(--duration-normal) var(--ease-standard);
}
.track.on .thumb { inset-inline-start: 19px; }
</style>
