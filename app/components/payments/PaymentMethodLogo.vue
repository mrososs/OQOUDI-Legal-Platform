<script setup lang="ts">
import type { ManualMethod } from '#shared/domain/manualPayments'

/** Brand mark for a manual payment method (assets in public/payments). */
const props = withDefaults(defineProps<{ method: ManualMethod | string, size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })
const { t, te } = useI18n()

const SRC: Record<string, string> = {
  instapay: '/payments/instapay.png',
  vodafone_cash: '/payments/vodafone-cash.png',
  paypal: '/payments/paypal.svg',
}
const src = computed(() => SRC[props.method] ?? null)
const alt = computed(() => (te(`mpay.methods.${props.method}.label`) ? t(`mpay.methods.${props.method}.label`) : String(props.method)))
</script>

<template>
  <span class="logo" :class="[`logo--${size}`, `logo--${method}`]">
    <img v-if="src" :src="src" :alt="alt" loading="lazy" decoding="async">
    <span v-else class="fallback" aria-hidden="true">{{ alt.slice(0, 2) }}</span>
  </span>
</template>

<style scoped>
.logo {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;
  background: #fff; border: 1px solid var(--border-subtle); border-radius: 12px;
}
.logo--sm { width: 40px; height: 28px; border-radius: 8px; }
.logo--md { width: 64px; height: 44px; }
.logo--lg { width: 96px; height: 64px; border-radius: 14px; }
.logo img { width: 100%; height: 100%; object-fit: contain; display: block; }
/* The supplied artwork has generous whitespace; zoom to the mark. */
.logo--instapay img { transform: scale(1.35); }
.logo--vodafone_cash img { transform: scale(1.9); }
.logo--paypal img { transform: scale(1.05); }
.fallback { font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
</style>
