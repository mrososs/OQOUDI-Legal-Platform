<script setup lang="ts">
const { t } = useI18n()
const fmt = useFormat()
const session = useSessionStore()
const route = useRoute()
const getRouteBaseName = useRouteBaseName()
const { counts } = useDashboardBadges()

const items = computed(() => {
  const base = [
    { id: 'dashboard', label: t('dash.nav.overview'), to: '/dashboard', count: 0 },
    { id: 'dashboard-requests', label: t('dash.nav.requests'), to: '/dashboard/requests', count: counts.value.newRequests },
    { id: 'dashboard-calendar', label: t('dash.nav.calendar'), to: '/dashboard/calendar', count: counts.value.missingLinks },
  ]
  const admin = [
    { id: 'dashboard-services', label: t('dash.nav.services'), to: '/dashboard/services', count: 0 },
    { id: 'dashboard-pricing', label: t('dash.nav.pricing'), to: '/dashboard/pricing', count: 0 },
    { id: 'dashboard-payments', label: t('dash.nav.payments'), to: '/dashboard/payments', count: 0 },
  ]
  const tail = [
    { id: 'dashboard-reviews', label: t('dash.nav.reviews'), to: '/dashboard/reviews', count: counts.value.unrepliedReviews },
  ]
  const settings = [{ id: 'dashboard-settings', label: t('dash.nav.settings'), to: '/dashboard/settings', count: 0 }]
  return session.isAdmin ? [...base, ...admin, ...tail, ...settings] : [...base, ...tail]
})

const current = computed(() => {
  const name = String(getRouteBaseName(route) ?? '')
  const match = items.value.filter(i => i.id !== 'dashboard' && name.startsWith(i.id))
  return match[0]?.id ?? name
})

const roleLabel = computed(() => (session.isAdmin ? t('dash.roleAdmin') : t('dash.roleLawyer')))
</script>

<template>
  <div class="shell">
    <aside class="side">
      <div class="who">
        <NuxtLinkLocale to="/" class="logo-box" :aria-label="t('brand.homeLabel')">
          <img src="/brand/oqoudi-logo-tight.png" :alt="t('brand.name')" width="42" height="42">
        </NuxtLinkLocale>
        <div class="who-text">
          <div class="title">{{ t('dash.title') }}</div>
          <div class="sub">{{ session.profile?.fullName }} · {{ roleLabel }}</div>
        </div>
      </div>
      <nav class="nav" :aria-label="t('dash.nav.label')">
        <NuxtLinkLocale
          v-for="n in items"
          :key="n.id"
          :to="n.to"
          class="nav-item"
          :aria-current="current === n.id ? 'page' : undefined"
        >
          <span>{{ n.label }}</span>
          <span v-if="n.count > 0" class="count">{{ fmt.number(n.count) }}</span>
        </NuxtLinkLocale>
      </nav>
      <div class="side-foot desk-only">
        <NuxtLinkLocale to="/account" class="foot-link">{{ t('dash.myClientAccount') }}</NuxtLinkLocale>
        <NuxtLinkLocale to="/" class="foot-link">{{ t('dash.publicSite') }}</NuxtLinkLocale>
        <LayoutLanguageSwitch class="foot-link" />
        <LayoutSignOutButton inverse />
      </div>
    </aside>
    <main id="main" class="main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; display: flex; flex-direction: row; background: var(--surface-page); }
.side {
  width: 240px; flex-shrink: 0; background: var(--ink-900); color: var(--gold-200);
  display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; z-index: 10;
}
.who { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.logo-box { width: 48px; height: 48px; background: var(--cream-100); border-radius: 10px; padding: 3px; flex-shrink: 0; display: block; }
.logo-box img { width: 100%; height: 100%; object-fit: contain; display: block; }
.who-text { flex: 1; min-width: 0; }
.title { font-weight: 700; color: #fff; font-size: 15px; }
.sub { font-size: 12px; color: var(--gold-300); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; overflow-x: auto; overflow-y: hidden; }
.nav-item {
  display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px;
  border-radius: 8px; color: var(--gold-200); font-size: 14px; font-weight: 500; white-space: nowrap;
}
.nav-item:hover { color: #fff; background: rgba(248, 225, 196, 0.06); }
.nav-item[aria-current='page'] { background: rgba(248, 225, 196, 0.12); color: #fff; font-weight: 700; }
.count {
  min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: var(--gold-400);
  color: var(--ink-900); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;
}
.side-foot {
  margin-top: auto; padding: 14px 16px; border-top: 1px solid rgba(177, 154, 118, 0.25);
  display: flex; flex-direction: column; gap: 8px; font-size: 12px; align-items: flex-start;
}
.foot-link { color: var(--gold-300); font-size: 12px; padding: 0; }
.foot-link:hover { color: #fff; background: none; }
.main { flex: 1; min-width: 0; padding: clamp(14px, 2.5vw, 28px) clamp(14px, 2.5vw, 32px) 80px; }

@media (max-width: 979px) {
  .shell { flex-direction: column; }
  .side { width: auto; height: auto; }
  .nav { flex-direction: row; padding: 0 10px 10px; }
  .desk-only { display: none; }
}
</style>
