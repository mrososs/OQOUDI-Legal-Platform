<script setup lang="ts">
import { FLOW_INDEX, FLOW_STEPS, type OrderStatus } from '#shared/domain/orderStatus'

/** Compact 5-segment progress (payment → review → work → delivery → completion). */
const props = defineProps<{ status: OrderStatus }>()
const { t } = useI18n()
const idx = computed(() => FLOW_INDEX[props.status])
const label = computed(() => (idx.value < 0 ? t('status.cancelled.label') : t(`flow.${FLOW_STEPS[idx.value]}`)))
</script>

<template>
  <div class="bars" role="img" :aria-label="t('flow.aria', { step: label })">
    <span
      v-for="(s, i) in FLOW_STEPS"
      :key="s"
      class="bar"
      :class="{ 'bar--done': idx >= 0 && i < idx, 'bar--current': i === idx }"
    />
  </div>
</template>

<style scoped>
.bars { display: flex; gap: 3px; width: 100%; }
.bar { flex: 1; height: 4px; border-radius: 2px; background: var(--neutral-200); }
.bar--done { background: var(--ink-900); }
.bar--current { background: var(--gold-400); }
</style>
