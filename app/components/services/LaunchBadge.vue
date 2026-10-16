<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
import { resolveServicePrice, type PricedService } from '#shared/domain/pricing'

/** «خصم الإطلاق 50%» / «LAUNCH OFFER · 50% OFF» — rendered only while the offer genuinely applies. */
const props = defineProps<{ service: PricedService }>()

const { t } = useI18n()
const { active } = useLaunchCampaign()
const price = computed(() => resolveServicePrice(props.service, active.value))
</script>

<template>
  <span v-if="price.isLaunch" class="badge">
    <Sparkles :size="13" :stroke-width="2" aria-hidden="true" />
    {{ t('launch.badge', { pct: String(price.discountPercent ?? 0) }) }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 999px;
  background: var(--ink-900); color: var(--cream-100); font-size: 12px; font-weight: 700; letter-spacing: 0.02em;
  border: 1px solid var(--gold-400); white-space: nowrap;
}
.badge svg { color: var(--gold-300); }
</style>
