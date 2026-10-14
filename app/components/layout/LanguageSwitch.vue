<script setup lang="ts">
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const other = computed(() => locales.value.find(l => l.code !== locale.value))
</script>

<template>
  <NuxtLink
    v-if="other"
    :to="switchLocalePath(other.code)"
    class="lang"
    :lang="other.code"
    :hreflang="other.code"
  >
    {{ other.name }}
  </NuxtLink>
</template>

<style scoped>
.lang {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-accent);
  padding: 6px 10px;
  border-radius: 8px;
}
.lang:hover { background: var(--surface-sunken); color: var(--text-strong); }
</style>
