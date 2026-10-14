<script setup lang="ts">
import { Lock } from '@lucide/vue'

withDefaults(defineProps<{ backTo?: string }>(), { backTo: '/account/orders' })
const { t } = useI18n()
</script>

<template>
  <div class="kh-card denied" role="alert">
    <Lock :size="32" :stroke-width="1.8" class="icon" aria-hidden="true" />
    <div class="title">{{ t('privacy.title') }}</div>
    <p class="text">{{ t('privacy.text') }}</p>
    <UiButton variant="secondary" :to="backTo">{{ t('portal.nav.orders') }}</UiButton>
  </div>
</template>

<style scoped>
.denied {
  max-width: 560px; margin: 40px auto; text-align: center; padding: 40px 24px;
  display: flex; flex-direction: column; gap: 10px; align-items: center;
}
.icon { color: var(--critical-500); }
.title { font-family: var(--font-heading); font-size: 20px; font-weight: 700; color: var(--text-strong); }
.text { margin: 0; color: var(--text-muted); line-height: 1.7; }
</style>
