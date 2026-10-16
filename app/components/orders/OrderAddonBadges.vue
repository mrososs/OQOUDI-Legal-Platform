<script setup lang="ts">
import { Languages, Zap } from '@lucide/vue'

/** Identifies orders with the VIP delivery / bilingual drafting add-ons (visible to customer, lawyers and admins). */
defineProps<{ vip?: boolean, bilingual?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <span v-if="vip || bilingual" class="badges">
    <span v-if="vip" class="b b--vip"><Zap :size="12" :stroke-width="2.2" aria-hidden="true" />{{ t('orders.vipBadge') }}</span>
    <span v-if="bilingual" class="b"><Languages :size="12" :stroke-width="2.2" aria-hidden="true" />{{ t('orders.bilingualBadge') }}</span>
  </span>
</template>

<style scoped>
.badges { display: inline-flex; gap: 6px; flex-wrap: wrap; vertical-align: middle; }
.b {
  display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px;
  color: var(--ink-900); background: var(--gold-50); border: 1px solid var(--gold-200); white-space: nowrap;
}
.b--vip { color: var(--cream-100); background: var(--ink-900); border-color: var(--gold-400); }
.b--vip svg { color: var(--gold-300); }
</style>
