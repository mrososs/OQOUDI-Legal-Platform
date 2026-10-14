<script setup lang="ts">
import { Bell } from '@lucide/vue'

const { t } = useI18n()
const fmt = useFormat()
const session = useSessionStore()
const route = useRoute()
const getRouteBaseName = useRouteBaseName()
const { unreadCount } = useNotificationsBadge()
const { activeCount } = useActiveOrdersCount()

const items = computed(() => [
  { id: 'account', label: t('portal.nav.overview'), to: '/account', count: 0 },
  { id: 'account-orders', label: t('portal.nav.orders'), to: '/account/orders', count: activeCount.value },
  { id: 'account-appointments', label: t('portal.nav.appointments'), to: '/account/appointments', count: 0 },
  { id: 'account-payments', label: t('portal.nav.payments'), to: '/account/payments', count: 0 },
  { id: 'account-notifications', label: t('portal.nav.notifications'), to: '/account/notifications', count: unreadCount.value, accent: true },
])

const current = computed(() => {
  const name = String(getRouteBaseName(route) ?? '')
  if (name.startsWith('account-orders')) return 'account-orders'
  return name
})

const accountKindLabel = computed(() =>
  session.account?.kind === 'company' ? t('portal.companyAccount') : t('portal.individualAccount'),
)
</script>

<template>
  <div class="shell">
    <aside class="side">
      <div class="who">
        <NuxtLinkLocale to="/" :aria-label="t('brand.homeLabel')">
          <img src="/brand/oqoudi-logo-tight.png" :alt="t('brand.name')" width="52" height="52" class="logo">
        </NuxtLinkLocale>
        <div class="who-text">
          <div class="name">{{ session.profile?.fullName }}</div>
          <div class="kind">{{ accountKindLabel }}</div>
        </div>
        <NuxtLinkLocale to="/account/notifications" class="bell mob-only" :aria-label="t('portal.nav.notifications')">
          <Bell :size="20" />
          <span v-if="unreadCount > 0" class="dot" />
        </NuxtLinkLocale>
      </div>
      <nav class="nav" :aria-label="t('portal.nav.label')">
        <NuxtLinkLocale
          v-for="n in items"
          :key="n.id"
          :to="n.to"
          class="nav-item"
          :aria-current="current === n.id ? 'page' : undefined"
        >
          <span>{{ n.label }}</span>
          <span v-if="n.count > 0" class="count" :class="{ 'count--accent': n.accent }">{{ fmt.number(n.count) }}</span>
        </NuxtLinkLocale>
      </nav>
      <div class="side-foot desk-only">
        <UiButton variant="primary" block to="/services">{{ t('portal.newRequest') }}</UiButton>
        <UiButton v-if="session.isStaff" variant="ghost" size="sm" block to="/dashboard">{{ t('portal.openDashboard') }}</UiButton>
        <LayoutLanguageSwitch />
        <LayoutSignOutButton />
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
  width: 264px;
  flex-shrink: 0;
  background: #fff;
  border-inline-end: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 10;
}
.who { display: flex; align-items: center; gap: 12px; padding: 14px 18px; }
.logo { width: 52px; height: 52px; object-fit: contain; display: block; }
.who-text { flex: 1; min-width: 0; }
.name { font-weight: 700; color: var(--text-strong); font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kind { font-size: 12px; color: var(--text-muted); }
.bell {
  position: relative; width: 44px; height: 44px; border-radius: 10px; border: 1px solid var(--border-default);
  background: #fff; color: var(--ink-900); display: flex; align-items: center; justify-content: center;
}
.dot { position: absolute; top: 6px; inset-inline-end: 6px; width: 8px; height: 8px; border-radius: 50%; background: var(--gold-400); }
.nav { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; overflow-x: auto; overflow-y: hidden; }
.nav-item {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 11px 14px; border-radius: 10px; color: var(--text-body); font-size: 15px; font-weight: 500; white-space: nowrap;
}
.nav-item:hover { background: var(--surface-sunken); color: var(--text-strong); }
.nav-item[aria-current='page'] { background: var(--gold-50); color: var(--text-strong); font-weight: 700; }
.count {
  min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: var(--neutral-200);
  color: var(--ink-900); font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center;
}
.count--accent { background: var(--gold-400); }
.side-foot { margin-top: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--border-subtle); align-items: stretch; text-align: center; }
.main { flex: 1; min-width: 0; padding: clamp(16px, 3vw, 36px) clamp(16px, 3vw, 40px) 80px; max-width: 1240px; }
.mob-only { display: none; }

@media (max-width: 979px) {
  .shell { flex-direction: column; }
  .side { width: auto; height: auto; border-inline-end: none; border-bottom: 1px solid var(--border-subtle); }
  .nav { flex-direction: row; padding: 0 12px 10px; }
  .desk-only { display: none; }
  .mob-only { display: flex; }
}
</style>
