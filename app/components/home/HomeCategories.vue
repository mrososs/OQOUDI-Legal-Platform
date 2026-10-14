<script setup lang="ts">
import type { Category, ServiceSummary } from '~/repositories/catalog'

const props = defineProps<{
  categories: Category[]
  services: ServiceSummary[]
}>()

const { t } = useI18n()
const f = useFormat()

const cards = computed(() => props.categories.map(c => ({
  ...c,
  count: props.services.filter(s => s.categoryIds.includes(c.id)).length,
})))
</script>

<template>
  <section class="container section">
    <SharedSectionHeading :eyebrow="t('home.categories.eyebrow')" :title="t('home.categories.title')" />
    <div class="grid">
      <NuxtLinkLocale v-for="c in cards" :key="c.id" :to="`/services/${c.slug}`" class="kh-card kh-card--interactive card">
        <div class="icon"><ServicesCategoryIcon :icon="c.icon" /></div>
        <div class="title">{{ f.text(c.title) }}</div>
        <div class="desc">{{ f.text(c.description) }}</div>
        <div class="foot">
          <span class="count">{{ t('home.categories.count', { n: f.number(c.count) }) }}</span>
          <span class="cta">{{ t('home.categories.cta') }}</span>
        </div>
      </NuxtLinkLocale>
    </div>
  </section>
</template>

<style scoped>
.section { padding-top: clamp(48px, 8vw, 96px); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 20px; }
.card { text-align: start; display: flex; flex-direction: column; gap: 14px; padding: 28px; color: inherit; }
.icon {
  width: 48px; height: 48px; border-radius: 12px; background: var(--ink-900); color: var(--cream-100);
  display: flex; align-items: center; justify-content: center;
}
.title { font-family: var(--font-heading); font-size: 22px; font-weight: 700; color: var(--text-strong); }
.desc { font-size: 15px; line-height: 1.7; color: var(--text-body); }
.foot {
  display: flex; justify-content: space-between; align-items: center; margin-top: auto;
  padding-top: 8px; border-top: 1px solid var(--border-subtle);
}
.count { font-size: 13px; color: var(--text-muted); }
.cta { font-size: 14px; font-weight: 600; color: var(--text-accent); }
</style>
