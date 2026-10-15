<script setup lang="ts">
import { Check } from '@lucide/vue'
import type { ManualMethod, ManualMethodConfig } from '#shared/domain/manualPayments'

/** Step 2: choose InstaPay / Vodafone Cash / PayPal (ARIA radiogroup with arrow-key support). */
const method = defineModel<ManualMethod | null>({ required: true })
const props = defineProps<{ methods: ManualMethodConfig[], disabled?: boolean }>()
const { t } = useI18n()

const groupRef = useTemplateRef<HTMLDivElement>('group')
const enabled = computed(() => props.methods.filter(m => m.available))

function select(m: ManualMethodConfig) {
  if (!m.available || props.disabled) return
  method.value = m.id
}

/** Roving focus: arrows move between available methods (RTL-aware via DOM order). */
function onKeydown(e: KeyboardEvent) {
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']
  if (!keys.includes(e.key) || !enabled.value.length) return
  e.preventDefault()
  const rtl = getComputedStyle(groupRef.value!).direction === 'rtl'
  const forward = e.key === 'ArrowDown' || (e.key === 'ArrowRight' ? !rtl : e.key === 'ArrowLeft' ? rtl : false)
  const idx = enabled.value.findIndex(m => m.id === method.value)
  const next = enabled.value[(idx + (forward ? 1 : -1) + enabled.value.length) % enabled.value.length]!
  method.value = next.id
  nextTick(() => groupRef.value?.querySelector<HTMLElement>(`[data-method="${next.id}"]`)?.focus())
}

function tabIndexFor(m: ManualMethodConfig) {
  if (!m.available) return -1
  if (method.value) return method.value === m.id ? 0 : -1
  return enabled.value[0]?.id === m.id ? 0 : -1
}
</script>

<template>
  <div ref="group" class="methods" role="radiogroup" :aria-label="t('mpay.steps.method')" @keydown="onKeydown">
    <button
      v-for="m in methods"
      :key="m.id"
      type="button"
      role="radio"
      class="method"
      :data-method="m.id"
      :aria-checked="method === m.id"
      :aria-disabled="!m.available || disabled"
      :tabindex="tabIndexFor(m)"
      @click="select(m)"
    >
      <span class="check" aria-hidden="true"><Check :size="14" :stroke-width="3" /></span>
      <PaymentsPaymentMethodLogo :method="m.id" size="lg" />
      <span class="label">{{ t(`mpay.methods.${m.id}.label`) }}</span>
      <span class="sub">{{ m.available ? t(`mpay.methods.${m.id}.sub`) : t('mpay.unavailable') }}</span>
    </button>
  </div>
</template>

<style scoped>
.methods { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px; }
.method {
  position: relative; text-align: center; padding: 18px 14px 16px; border-radius: 16px;
  border: 1.5px solid var(--border-default); background: var(--surface-card); cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 8px; font-family: inherit;
  transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard);
}
.method:hover:not([aria-disabled='true']) { border-color: var(--gold-400); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.method:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.method[aria-checked='true'] { border-color: var(--ink-900); background: var(--gold-50); box-shadow: var(--shadow-sm); }
.method[aria-disabled='true'] { cursor: not-allowed; opacity: 0.55; }
.check {
  position: absolute; top: 10px; inset-inline-end: 10px; width: 22px; height: 22px; border-radius: 50%;
  border: 1.5px solid var(--border-default); color: transparent; display: flex; align-items: center; justify-content: center;
}
.method[aria-checked='true'] .check { background: var(--ink-900); border-color: var(--ink-900); color: var(--cream-100); }
.label { font-weight: 800; color: var(--text-strong); font-size: 16px; }
.sub { font-size: 12px; color: var(--text-muted); line-height: 1.6; }
@media (prefers-reduced-motion: reduce) { .method { transition: none; } .method:hover { transform: none; } }
</style>
