<script setup lang="ts">
import { resolveServicePrice, type PricedService } from '#shared/domain/pricing'

/**
 * The price of a service as the customer should read it right now:
 * regular price, or — only while the launch campaign is active and the service is
 * eligible — the original price struck through, the launch price prominently and the
 * discount percentage. Display only; the server decides the charged amount.
 */
const props = withDefaults(defineProps<{
  service: PricedService
  size?: 'md' | 'lg'
}>(), { size: 'md' })

const { t } = useI18n()
const f = useFormat()
const { active } = useLaunchCampaign()

const price = computed(() => resolveServicePrice(props.service, active.value))
const isQuote = computed(() => props.service.pricingType === 'quote')
</script>

<template>
  <div class="tag" :class="[`tag--${size}`, { 'tag--launch': price.isLaunch }]">
    <template v-if="price.isLaunch">
      <span class="was">
        <span class="sr-only">{{ t('launch.originalPrice') }}: </span><s>{{ f.money(price.regularMinor) }}</s>
      </span>
      <span class="now">
        <span class="sr-only">{{ t('launch.launchPrice') }}: </span>{{ f.money(price.currentMinor) }}
      </span>
      <span class="pct">{{ t('launch.percentOff', { pct: String(price.discountPercent ?? 0) }) }}</span>
    </template>
    <span v-else class="now">{{ isQuote ? t('services.startsFrom', { price: f.money(price.currentMinor) }) : f.money(price.currentMinor) }}</span>
  </div>
</template>

<style scoped>
.tag { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.now { font-family: var(--font-heading); font-weight: 800; color: var(--text-strong); font-size: 18px; line-height: 1.2; }
.tag--lg .now { font-size: 32px; }
.was { color: var(--text-muted); font-size: 14px; }
.tag--lg .was { font-size: 17px; }
.was s { text-decoration-thickness: 1.5px; text-decoration-color: var(--critical-500); }
.pct {
  font-size: 12px; font-weight: 700; color: var(--gold-700); background: var(--gold-50);
  border: 1px solid var(--gold-200); border-radius: 999px; padding: 2px 10px; white-space: nowrap;
}
.tag--launch .now { color: var(--ink-900); }
</style>
