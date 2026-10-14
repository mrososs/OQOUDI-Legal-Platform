<script setup lang="ts">
export interface KpiItem {
  key: string
  label: string
  value: string
  sub: string
  to: string
  warn?: boolean
}

defineProps<{ items: KpiItem[] }>()
</script>

<template>
  <div class="kpis">
    <NuxtLinkLocale v-for="k in items" :key="k.key" :to="k.to" class="kh-card kpi">
      <span class="label">{{ k.label }}</span>
      <span class="value">{{ k.value }}</span>
      <span class="sub" :class="{ warn: k.warn }">{{ k.sub }}</span>
    </NuxtLinkLocale>
  </div>
</template>

<style scoped>
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.kpi { padding: 16px; display: flex; flex-direction: column; gap: 6px; color: inherit; }
.kpi:hover { box-shadow: var(--shadow-md); }
.label { font-size: 13px; color: var(--text-muted); }
.value { font-family: var(--font-heading); font-size: 28px; font-weight: 800; color: var(--text-strong); line-height: 1.2; }
.sub { font-size: 12px; color: var(--text-muted); }
.sub.warn { color: var(--gold-600); font-weight: 600; }
</style>
