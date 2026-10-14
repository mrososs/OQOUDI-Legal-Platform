<script setup lang="ts">
import { Search } from '@lucide/vue'

const { t } = useI18n()
const localePath = useLocalePath()
const query = shallowRef('')

const quick = computed(() => [
  { label: t('home.quick.lease'), q: t('home.quick.leaseQuery') },
  { label: t('home.quick.company'), q: t('home.quick.companyQuery') },
  { label: t('home.quick.consultation'), q: t('home.quick.consultationQuery') },
])

function search(q = query.value) {
  navigateTo({ path: localePath('/services'), query: q.trim() ? { q: q.trim() } : {} })
}
</script>

<template>
  <section class="wrap">
    <div class="kh-card kh-card--raised card">
      <p class="lead">{{ t('home.lead') }}</p>
      <form class="search" role="search" @submit.prevent="search()">
        <span class="icon" aria-hidden="true"><Search :size="20" :stroke-width="1.8" /></span>
        <input
          v-model="query"
          type="search"
          :placeholder="t('home.searchPlaceholder')"
          :aria-label="t('home.searchLabel')"
        >
        <UiButton type="submit">{{ t('home.searchCta') }}</UiButton>
      </form>
      <div class="row">
        <div class="quick">
          <span class="quick-label">{{ t('home.popular') }}</span>
          <button v-for="c in quick" :key="c.label" type="button" class="chip" @click="search(c.q)">{{ c.label }}</button>
        </div>
        <div class="ctas">
          <UiButton to="/services">{{ t('home.browseArrow') }}</UiButton>
          <UiButton variant="secondary" to="/service/video-consultation">{{ t('home.bookMeeting') }}</UiButton>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.wrap { max-width: 1080px; margin: 0 auto; padding: clamp(24px, 4vw, 40px) var(--container-pad) clamp(40px, 6vw, 64px); }
.card { display: flex; flex-direction: column; gap: 18px; padding: clamp(18px, 3vw, 28px); }
.lead { font-size: 17px; line-height: 1.8; margin: 0; color: var(--text-body); }
.search { display: flex; gap: 8px; background: #fff; border: 1.5px solid var(--border-default); border-radius: 14px; padding: 6px; }
.search:focus-within { border-color: var(--accent); box-shadow: var(--shadow-focus); }
.icon { display: flex; align-items: center; padding: 0 10px; color: var(--text-muted); }
.search input { flex: 1; min-width: 0; border: none; outline: none; font-size: 16px; background: transparent; color: var(--text-strong); }
.row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.quick { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.quick-label { font-size: 13px; color: var(--text-muted); }
.chip {
  border: 1px solid var(--border-default); background: transparent; border-radius: 999px; padding: 6px 14px;
  font-size: 13px; color: var(--text-body); cursor: pointer; white-space: nowrap;
}
.chip:hover { border-color: var(--ink-900); color: var(--text-strong); }
.ctas { display: flex; gap: 10px; flex-wrap: wrap; }
</style>
