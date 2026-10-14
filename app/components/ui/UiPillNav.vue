<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

export interface PillNavItem {
  id: string
  label: string
  to?: RouteLocationRaw
}

defineProps<{
  items: PillNavItem[]
  activeId?: string | null
  ariaLabel?: string
}>()

const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <nav class="kh-pillnav" :aria-label="ariaLabel">
    <template v-for="item in items" :key="item.id">
      <NuxtLinkLocale
        v-if="item.to"
        :to="(item.to as never)"
        class="kh-pillnav__item"
        :aria-current="item.id === activeId ? 'page' : undefined"
        @click="emit('select', item.id)"
      >
        {{ item.label }}
      </NuxtLinkLocale>
      <button
        v-else
        type="button"
        class="kh-pillnav__item"
        :aria-current="item.id === activeId ? 'true' : undefined"
        @click="emit('select', item.id)"
      >
        {{ item.label }}
      </button>
    </template>
  </nav>
</template>
