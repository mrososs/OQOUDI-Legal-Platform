<script setup lang="ts">
import type { AdminKpis } from '~/composables/useAdminManualPayments'

/** Manual verification counters. Demo approvals are labelled simulated, never revenue. */
const props = defineProps<{ kpis: AdminKpis, demo: boolean }>()
const emit = defineEmits<{ filter: [status: 'pending_review' | 'approved' | 'rejected' | null] }>()
const { t } = useI18n()
const f = useFormat()

const items = computed(() => [
  { key: 'pending_review' as const, label: t('admin.mpay.kpi.pending'), value: f.number(props.kpis.pending), sub: t('admin.mpay.kpi.pendingSub'), tone: 'caution' },
  {
    key: 'approved' as const,
    label: t('admin.mpay.kpi.approved'),
    value: f.number(props.kpis.approved),
    sub: props.kpis.approvedDemoAmountMinor
      ? t('admin.mpay.kpi.approvedSimulated', { amount: f.money(props.kpis.approvedDemoAmountMinor) })
      : t('admin.mpay.kpi.approvedReal', { amount: f.money(props.kpis.approvedRealAmountMinor) }),
    tone: 'positive',
  },
  { key: 'rejected' as const, label: t('admin.mpay.kpi.rejected'), value: f.number(props.kpis.rejected), sub: t('admin.mpay.kpi.rejectedSub'), tone: 'critical' },
  { key: null, label: t('admin.mpay.kpi.pendingAmount'), value: f.money(props.kpis.pendingAmountMinor), sub: props.demo ? t('admin.mpay.kpi.demoNote') : t('admin.mpay.kpi.pendingAmountSub'), tone: 'accent' },
])
</script>

<template>
  <div class="kpis">
    <button v-for="k in items" :key="k.label" type="button" class="kh-card kpi" :class="`kpi--${k.tone}`" @click="emit('filter', k.key)">
      <span class="label">{{ k.label }}</span>
      <span class="value">{{ k.value }}</span>
      <span class="sub">{{ k.sub }}</span>
    </button>
  </div>
</template>

<style scoped>
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 12px; }
.kpi {
  padding: 16px; display: flex; flex-direction: column; gap: 6px; text-align: start; cursor: pointer; font-family: inherit;
  border-top: 3px solid var(--kpi-accent, var(--border-strong));
}
.kpi:hover { box-shadow: var(--shadow-md); }
.kpi:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.kpi--caution { --kpi-accent: var(--caution-500); }
.kpi--positive { --kpi-accent: var(--positive-500); }
.kpi--critical { --kpi-accent: var(--critical-500); }
.kpi--accent { --kpi-accent: var(--gold-500); }
.label { font-size: 13px; color: var(--text-muted); }
.value { font-family: var(--font-heading); font-size: 26px; font-weight: 800; color: var(--text-strong); line-height: 1.2; }
.sub { font-size: 12px; color: var(--text-muted); }
</style>
