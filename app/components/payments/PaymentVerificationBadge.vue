<script setup lang="ts">
import { VERIFICATION_TONE, type VerificationStatus } from '#shared/domain/manualPayments'

defineProps<{ status: VerificationStatus, demo?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <span class="wrap">
    <UiBadge :tone="VERIFICATION_TONE[status]">{{ t(`mpay.badge.${status}`) }}</UiBadge>
    <UiBadge v-if="demo" tone="neutral">{{ t('mpay.demo.tag') }}</UiBadge>
  </span>
</template>

<style scoped>
.wrap { display: inline-flex; gap: 4px; flex-wrap: wrap; }
</style>
