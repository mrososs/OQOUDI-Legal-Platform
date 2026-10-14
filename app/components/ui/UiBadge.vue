<script setup lang="ts">
import type { Tone } from '#shared/domain/orderStatus'

withDefaults(defineProps<{
  tone?: Tone | 'solid'
  dot?: boolean
}>(), { tone: 'neutral' })
</script>

<template>
  <span class="kh-badge" :class="[`kh-badge--${tone}`, { 'kh-badge--dot': dot }]">
    <slot />
  </span>
</template>
