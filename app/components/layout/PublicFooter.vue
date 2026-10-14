<script setup lang="ts">
const { t } = useI18n()

const columns = computed(() => [
  {
    title: t('footer.services'),
    links: [
      { label: t('nav.individuals'), to: '/services/individuals' },
      { label: t('nav.companies'), to: '/services/companies' },
      { label: t('footer.writtenConsultation'), to: '/service/written-consultation' },
      { label: t('footer.videoConsultation'), to: '/service/video-consultation' },
    ],
  },
  {
    title: t('brand.name'),
    links: [
      { label: t('nav.about'), to: '/about' },
      { label: t('nav.faq'), to: '/faq' },
      { label: t('nav.contact'), to: '/contact' },
    ],
  },
  {
    title: t('footer.accounts'),
    links: [
      { label: t('footer.clientAccount'), to: '/account' },
      { label: t('footer.lawyerDashboard'), to: '/dashboard' },
      { label: t('nav.login'), to: '/auth/login' },
    ],
  },
])

const year = new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(new Date().getFullYear())
</script>

<template>
  <footer class="footer">
    <div class="grid container">
      <div class="brand">
        <div class="logo-box">
          <img src="/brand/oqoudi-logo-tight.png" :alt="t('brand.name')" width="88" height="88">
        </div>
        <p class="about">{{ t('footer.about') }}</p>
      </div>
      <div v-for="col in columns" :key="col.title" class="col">
        <div class="col-title">{{ col.title }}</div>
        <NuxtLinkLocale v-for="l in col.links" :key="l.to" :to="l.to" class="link">{{ l.label }}</NuxtLinkLocale>
      </div>
    </div>
    <div class="bottom container">
      <span>© {{ $i18n.locale === 'en' ? new Date().getFullYear() : year }} {{ t('brand.name') }}</span>
      <span>{{ t('footer.rights') }}</span>
    </div>
  </footer>
</template>

<style scoped>
.footer { background: var(--surface-footer); color: var(--gold-200); }
.grid {
  padding-block: 56px 28px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 32px;
}
.brand { display: flex; flex-direction: column; gap: 14px; }
.logo-box { width: 104px; height: 104px; background: var(--cream-100); border-radius: 16px; padding: 8px; }
.logo-box img { width: 100%; height: 100%; object-fit: contain; display: block; }
.about { margin: 0; font-size: 14px; line-height: 1.8; }
.col { display: flex; flex-direction: column; gap: 10px; }
.col-title { font-weight: 700; color: #fff; font-size: 15px; }
.link { color: var(--gold-200); font-size: 14px; }
.link:hover { color: #fff; }
.bottom {
  padding-block: 18px 28px;
  border-top: 1px solid rgba(177, 154, 118, 0.25);
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--gold-300);
}
</style>
