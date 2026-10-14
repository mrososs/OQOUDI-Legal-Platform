<script setup lang="ts">
import { STATUS_TONE, type OrderStatus } from '#shared/domain/orderStatus'

/** `audience="client"` uses the simplified customer wording from the prototype. */
const props = withDefaults(defineProps<{
  status: OrderStatus
  audience?: 'client' | 'staff'
}>(), { audience: 'staff' })

const { t } = useI18n()
const label = computed(() => t(`status.${props.status}.${props.audience === 'client' ? 'client' : 'label'}`))
</script>

<template>
  <UiBadge :tone="STATUS_TONE[status]">{{ label }}</UiBadge>
</template>
