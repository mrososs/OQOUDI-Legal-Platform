<script setup lang="ts">
import type { PillNavItem } from '~/components/ui/UiPillNav.vue'

defineProps<{
  active?: 'login' | 'register'
  showTabs?: boolean
}>()

const { t } = useI18n()
const route = useRoute()

const tabs = computed<PillNavItem[]>(() => [
  { id: 'login', label: t('auth.loginTab'), to: { path: '/auth/login', query: route.query } },
  { id: 'register', label: t('auth.registerTab'), to: { path: '/auth/register', query: route.query } },
])
</script>

<template>
  <section class="wrap">
    <div class="kh-card kh-card--raised card">
      <div class="logo">
        <img src="/brand/oqoudi-logo-tight.png" :alt="t('brand.name')" width="96" height="96">
      </div>
      <div v-if="showTabs" class="tabs">
        <UiPillNav :items="tabs" :active-id="active" :aria-label="t('auth.tabsLabel')" />
      </div>
      <slot />
      <p class="privacy">{{ t('auth.privacyNote') }}</p>
    </div>
  </section>
</template>

<style scoped>
.wrap { max-width: 480px; margin: 0 auto; padding: clamp(32px, 6vw, 72px) clamp(16px, 4vw, 24px) 96px; }
.card { display: flex; flex-direction: column; gap: 20px; padding: clamp(24px, 4vw, 36px); }
.logo { display: flex; justify-content: center; }
.logo img { width: 96px; height: 96px; object-fit: contain; }
.tabs { display: flex; justify-content: center; }
.privacy { margin: 0; font-size: 12px; color: var(--text-muted); text-align: center; line-height: 1.6; }
</style>
