<script setup lang="ts">
import { PAYMENT_TONE, type PaymentStatus } from '#shared/domain/orderStatus'

defineProps<{ status: PaymentStatus, prefix?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <UiBadge :tone="PAYMENT_TONE[status]">
    <template v-if="prefix">{{ `${t('pay.prefix')} ` }}</template>{{ t(`pay.${status}`) }}
  </UiBadge>
</template>
