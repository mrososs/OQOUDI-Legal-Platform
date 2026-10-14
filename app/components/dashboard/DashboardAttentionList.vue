<script setup lang="ts">
export interface AttentionItem {
  key: string
  text: string
  orderNumber: string
}

defineProps<{ items: AttentionItem[] }>()
const { t } = useI18n()
</script>

<template>
  <section class="kh-card kh-card--flush panel">
    <h2 class="head">{{ t('dashOps.attentionTitle') }}</h2>
    <p v-if="!items.length" class="empty">{{ t('dashOps.attentionEmpty') }}</p>
    <NuxtLinkLocale
      v-for="a in items"
      :key="a.key"
      :to="`/dashboard/requests/${a.orderNumber}`"
      class="row"
    >
      <span class="dot" aria-hidden="true" />
      <span class="text">{{ a.text }}</span>
      <span class="no ltr">{{ a.orderNumber }}</span>
    </NuxtLinkLocale>
  </section>
</template>

<style scoped>
.head { font-size: 16px; font-weight: 700; margin: 0; padding: 16px 18px; }
.empty { margin: 0; padding: 0 18px 18px; color: var(--text-muted); }
.row {
  display: flex; gap: 10px; align-items: center; border-top: 1px solid var(--border-subtle);
  padding: 12px 18px; color: var(--text-body);
}
.row:hover { background: var(--neutral-50); color: var(--text-strong); }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gold-400); flex-shrink: 0; }
.text { flex: 1; line-height: 1.6; }
.no { font-size: 12px; color: var(--text-muted); }
</style>
