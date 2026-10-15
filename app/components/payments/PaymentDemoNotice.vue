<script setup lang="ts">
import { FlaskConical } from '@lucide/vue'

/** Always-visible demo banner while PAYMENT_MODE=manual_demo. */
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
const { t } = useI18n()
</script>

<template>
  <div class="demo" :class="{ compact }" role="note">
    <FlaskConical :size="compact ? 16 : 20" :stroke-width="2" aria-hidden="true" class="icon" />
    <div>
      <strong class="title">{{ t('mpay.demo.badge') }} —</strong>
      <span class="text">{{ t('mpay.demo.notice') }}</span>
    </div>
  </div>
</template>

<style scoped>
.demo {
  display: flex; gap: 12px; align-items: flex-start; border-radius: 14px; padding: 14px 16px;
  background: repeating-linear-gradient(-45deg, var(--caution-100), var(--caution-100) 12px, #fff7e8 12px, #fff7e8 24px);
  border: 1px dashed var(--caution-500); color: var(--text-strong);
}
.icon { color: var(--caution-500); flex-shrink: 0; margin-top: 2px; }
.title { font-weight: 800; color: var(--caution-500); font-size: 14px; margin-inline-end: 4px; }
.text { font-size: 14px; line-height: 1.7; }
.compact { padding: 8px 12px; border-radius: 10px; }
.compact .title { font-size: 12px; }
.compact .text { font-size: 12px; }
</style>
