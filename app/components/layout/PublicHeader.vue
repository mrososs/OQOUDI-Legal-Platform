<script setup lang="ts">
import { Menu, X } from '@lucide/vue'
import type { PillNavItem } from '~/components/ui/UiPillNav.vue'

const { t } = useI18n()
const route = useRoute()
const user = useSupabaseUser()
const session = useSessionStore()
const getRouteBaseName = useRouteBaseName()

const menuOpen = ref(false)

const navItems = computed<PillNavItem[]>(() => [
  { id: 'home', label: t('nav.home'), to: '/' },
  { id: 'individuals', label: t('nav.individuals'), to: '/services/individuals' },
  { id: 'companies', label: t('nav.companies'), to: '/services/companies' },
  { id: 'consultations', label: t('nav.consultations'), to: '/services/consultations' },
  { id: 'about', label: t('nav.about'), to: '/about' },
  { id: 'faq', label: t('nav.faq'), to: '/faq' },
  { id: 'contact', label: t('nav.contact'), to: '/contact' },
])

const activeId = computed(() => {
  const name = String(getRouteBaseName(route) ?? '')
  if (name === 'index') return 'home'
  if (name === 'services-category') return String(route.params.category ?? '')
  if (['about', 'faq', 'contact'].includes(name)) return name
  return null
})

const accountPath = computed(() => (session.isStaff ? '/dashboard' : '/account'))

watch(() => route.fullPath, () => {
  menuOpen.value = false
})
</script>

<template>
  <header class="header">
    <div class="bar container">
      <NuxtLinkLocale to="/" class="logo" :aria-label="t('brand.homeLabel')">
        <img src="/brand/oqoudi-logo-tight.png" :alt="t('brand.name')" width="72" height="72">
      </NuxtLinkLocale>

      <div class="desk-nav">
        <UiPillNav :items="navItems" :active-id="activeId" :aria-label="t('nav.main')" />
      </div>

      <div class="actions">
        <LayoutLanguageSwitch class="desk-only" />
        <UiButton v-if="!user" variant="ghost" size="sm" to="/auth/login" class="desk-only">
          {{ t('nav.login') }}
        </UiButton>
        <UiButton variant="primary" size="sm" :to="user ? accountPath : '/auth/login'">
          {{ t('nav.myAccount') }}
        </UiButton>
        <button
          type="button"
          class="burger"
          :aria-label="t('nav.menu')"
          :aria-expanded="menuOpen"
          aria-controls="mobile-menu"
          @click="menuOpen = !menuOpen"
        >
          <X v-if="menuOpen" :size="20" />
          <Menu v-else :size="20" />
        </button>
      </div>
    </div>

    <nav v-if="menuOpen" id="mobile-menu" class="mobile-nav" :aria-label="t('nav.main')">
      <NuxtLinkLocale v-for="n in navItems" :key="n.id" :to="(n.to as never)" class="mobile-link">
        {{ n.label }}
      </NuxtLinkLocale>
      <NuxtLinkLocale v-if="!user" to="/auth/login" class="mobile-link mobile-link--accent">
        {{ t('nav.loginOrRegister') }}
      </NuxtLinkLocale>
      <LayoutLanguageSwitch class="mobile-link" />
    </nav>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
}
.bar {
  padding-block: 10px;
  display: flex;
  align-items: center;
  gap: 20px;
}
.logo { display: flex; align-items: center; flex-shrink: 0; }
.logo img { height: 72px; width: 72px; object-fit: contain; display: block; }
.desk-nav { flex: 1; display: flex; justify-content: center; }
.actions { display: flex; gap: 8px; align-items: center; margin-inline-start: auto; }
.burger {
  display: none;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: #fff;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--ink-900);
}
.mobile-nav {
  border-top: 1px solid var(--border-subtle);
  background: #fff;
  padding: 8px 16px 16px;
  display: flex;
  flex-direction: column;
}
.mobile-link {
  text-align: start;
  border-bottom: 1px solid var(--border-subtle);
  padding: 14px 4px;
  font-size: 16px;
  color: var(--text-strong);
}
.mobile-link--accent { color: var(--text-accent); border-bottom: none; }

@media (max-width: 1179px) {
  .desk-nav, .desk-only { display: none; }
  .burger { display: flex; }
}
</style>
