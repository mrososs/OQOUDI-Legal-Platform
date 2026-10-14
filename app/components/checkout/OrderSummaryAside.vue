<script setup lang="ts">
import type { Localized } from '#shared/domain/localized'

defineProps<{
  title: Localized
  baseMinor: number
  isQuote: boolean
  addons: { id: string, title: Localized, priceMinor: number }[]
  totalMinor: number
  meetingLabel?: string
  customerName?: string
}>()

const { t } = useI18n()
const f = useFormat()
</script>

<template>
  <aside class="aside">
    <div class="kh-card card">
      <div class="muted small">{{ t('checkout.summary') }}</div>
      <div class="title">{{ f.text(title) }}</div>
      <div v-if="meetingLabel" class="meeting">{{ meetingLabel }}</div>
      <div class="lines">
        <div class="line"><span>{{ t('checkout.servicePrice') }}</span><span>{{ isQuote ? t('services.startsFrom', { price: f.money(baseMinor) }) : f.money(baseMinor) }}</span></div>
        <div v-for="a in addons" :key="a.id" class="line"><span>{{ f.text(a.title) }}</span><span>+ {{ f.money(a.priceMinor) }}</span></div>
      </div>
      <div class="total"><strong>{{ t('services.total') }}</strong><strong class="total-value">{{ isQuote ? t('services.startsFrom', { price: f.money(totalMinor) }) : f.money(totalMinor) }}</strong></div>
      <div v-if="customerName" class="note">{{ t('checkout.snapshotNote', { name: customerName }) }}</div>
    </div>
  </aside>
</template>

<style scoped>
.aside { flex: 1 1 300px; max-width: 100%; position: sticky; top: 100px; }
.card { display: flex; flex-direction: column; gap: 12px; }
.small { font-size: 13px; }
.title { font-family: var(--font-heading); font-size: 18px; font-weight: 700; color: var(--text-strong); }
.meeting { font-size: 14px; }
.lines { display: flex; flex-direction: column; gap: 8px; font-size: 14px; padding-top: 12px; border-top: 1px solid var(--border-subtle); }
.line { display: flex; justify-content: space-between; gap: 8px; }
.total { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--border-subtle); }
.total-value { font-size: 20px; color: var(--text-strong); }
.note { font-size: 12px; color: var(--text-muted); line-height: 1.6; }
</style>
