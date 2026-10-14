<script setup lang="ts">
import { ShieldCheck } from '@lucide/vue'

export type PaymentMethod = 'card' | 'wallet' | 'fawry'

const method = defineModel<PaymentMethod>({ required: true })
const { t } = useI18n()
const methods: PaymentMethod[] = ['card', 'wallet', 'fawry']
</script>

<template>
  <div class="kh-card card">
    <h2 class="title">{{ t('checkout.paymentMethod') }}</h2>
    <div class="methods" role="radiogroup" :aria-label="t('checkout.paymentMethod')">
      <button
        v-for="m in methods"
        :key="m"
        type="button"
        role="radio"
        class="method"
        :aria-checked="method === m"
        @click="method = m"
      >
        <span class="method-label">{{ t(`checkout.methods.${m}.label`) }}</span>
        <span class="method-sub">{{ t(`checkout.methods.${m}.sub`) }}</span>
      </button>
    </div>
    <p v-if="method === 'fawry'" class="info">{{ t('checkout.fawryInfo') }}</p>
    <div class="secure">
      <ShieldCheck :size="18" :stroke-width="1.8" aria-hidden="true" />
      <span>{{ t('checkout.hostedNotice') }}</span>
    </div>
  </div>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 16px; }
.title { font-size: 20px; font-weight: 700; margin: 0; }
.methods { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
.method {
  text-align: start; padding: 14px; border-radius: 12px; border: 1.5px solid var(--border-default);
  background: #fff; cursor: pointer; display: flex; flex-direction: column; gap: 4px;
}
.method[aria-checked='true'] { border-color: var(--ink-900); background: var(--gold-50); }
.method-label { font-weight: 700; color: var(--text-strong); font-size: 15px; }
.method-sub { font-size: 12px; color: var(--text-muted); }
.info { margin: 0; background: var(--neutral-100); border-radius: 12px; padding: 14px 16px; font-size: 14px; line-height: 1.7; }
.secure { display: flex; gap: 8px; align-items: center; font-size: 13px; color: var(--text-muted); }
</style>
