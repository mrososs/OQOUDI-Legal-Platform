<script setup lang="ts">
import { Briefcase, Building2, Scale, User } from '@lucide/vue'

const props = defineProps<{ icon: string, size?: number }>()
const component = computed(() => ({ user: User, building: Building2, scale: Scale }[props.icon] ?? Briefcase))
</script>

<template>
  <component :is="component" :size="size ?? 22" :stroke-width="1.7" aria-hidden="true" />
</template>
