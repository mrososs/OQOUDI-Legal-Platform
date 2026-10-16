<script setup lang="ts">
import type { Category, ServiceSummary } from '~/repositories/catalog'

const props = defineProps<{
  categories: Category[]
  services: ServiceSummary[]
}>()

const { t } = useI18n()
const f = useFormat()

/** Top-level cards; each lists its sub-categories (with accurate counts) as direct links. */
const cards = computed(() => props.categories
  .filter(c => !c.parentId)
  .map((c) => {
    const subs = props.categories
      .filter(s => s.parentId === c.id)
      .map(s => ({ ...s, count: props.services.filter(x => x.categoryIds.includes(s.id)).length }))
    const contracts = subs.reduce((n, s) => n + s.count, 0)
    return { ...c, subs, contracts, count: props.services.filter(s => s.categoryIds.includes(c.id)).length }
  }))
</script>

<template>
  <section class="container section">
    <SharedSectionHeading :eyebrow="t('home.categories.eyebrow')" :title="t('home.categories.title')" />
    <div class="grid">
      <article v-for="c in cards" :key="c.id" class="kh-card card">
        <div class="icon"><ServicesCategoryIcon :icon="c.icon" /></div>
        <h3 class="title">
          <NuxtLinkLocale :to="`/services/${c.slug}`" class="title-link">{{ f.text(c.title) }}</NuxtLinkLocale>
        </h3>
        <p class="desc">{{ f.text(c.description) }}</p>
        <ul v-if="c.subs.length" class="subs" :aria-label="t('directory.subcategoriesLabel')">
          <li v-for="s in c.subs" :key="s.id">
            <NuxtLinkLocale :to="`/services/${c.slug}/${s.slug}`" class="sub">
              <span>{{ f.text(s.title) }}</span><span class="sub-count">{{ f.number(s.count) }}</span>
            </NuxtLinkLocale>
          </li>
        </ul>
        <div class="foot">
          <span class="count">{{ c.contracts ? t('home.categories.contracts', { n: f.number(c.contracts) }) : t('home.categories.count', { n: f.number(c.count) }) }}</span>
          <NuxtLinkLocale :to="`/services/${c.slug}`" class="cta">{{ t('home.categories.cta') }}</NuxtLinkLocale>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.section { padding-top: clamp(48px, 8vw, 96px); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 20px; align-items: stretch; }
.card { text-align: start; display: flex; flex-direction: column; gap: 14px; padding: 28px; color: inherit; }
.icon {
  width: 48px; height: 48px; border-radius: 12px; background: var(--ink-900); color: var(--cream-100);
  display: flex; align-items: center; justify-content: center;
}
.title { margin: 0; font-family: var(--font-heading); font-size: 22px; font-weight: 700; }
.title-link { color: var(--text-strong); }
.desc { margin: 0; font-size: 15px; line-height: 1.7; color: var(--text-body); }
.subs { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
.sub {
  display: inline-flex; align-items: center; gap: 8px; padding: 5px 11px; border-radius: 999px; font-size: 13px;
  border: 1px solid var(--border-default); background: #fff; color: var(--text-body);
}
.sub:hover { border-color: var(--gold-400); color: var(--text-strong); }
.sub-count { font-size: 11px; font-weight: 700; color: var(--text-muted); background: var(--neutral-100); border-radius: 999px; padding: 0 7px; }
.foot {
  display: flex; justify-content: space-between; align-items: center; margin-top: auto;
  padding-top: 8px; border-top: 1px solid var(--border-subtle);
}
.count { font-size: 13px; color: var(--text-muted); }
.cta { font-size: 14px; font-weight: 600; color: var(--text-accent); }
</style>
