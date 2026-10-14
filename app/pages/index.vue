<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { fetchFaq, fetchPublicReviews } from '~/repositories/catalog'

const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()

const { categories, services, categoryLabel } = useCatalog()
const { data: reviews } = await useAsyncData('home:reviews', () => fetchPublicReviews(supabase, { minRating: 4, limit: 3 }), { default: () => [] })
const { data: faq } = await useAsyncData('faq', () => fetchFaq(supabase), { default: () => [] })
await Promise.all([categories, services])

const featured = computed(() => {
  const list = services.data.value.filter(s => s.isFeatured)
  return [...list.filter(s => s.kind === 'standard').slice(0, 4), ...list.filter(s => s.kind !== 'standard')].slice(0, 6)
})
const homeFaq = computed(() => faq.value.filter(x => x.showOnHome).slice(0, 4).map(x => ({
  id: x.id,
  question: f.text(x.question),
  answer: f.text(x.answer),
})))

// No page title: the app titleTemplate renders "brand — tagline" for the home page.
useSeoMeta({
  description: () => t('home.metaDescription'),
  ogTitle: () => t('home.metaTitle'),
  ogDescription: () => t('home.metaDescription'),
  ogImage: '/brand/oqoudi-cover.png',
})
</script>

<template>
  <div>
    <HomeHero />
    <HomeTrustStrip />
    <HomeCategories :categories="categories.data.value" :services="services.data.value" />

    <section class="container section">
      <SharedSectionHeading :eyebrow="t('home.featured.eyebrow')" :title="t('home.featured.title')">
        <UiButton variant="secondary" to="/services">{{ t('home.featured.all') }}</UiButton>
      </SharedSectionHeading>
      <div class="cards">
        <ServicesServiceCard
          v-for="s in featured"
          :key="s.id"
          :service="s"
          :category-label="categoryLabel(s.primaryCategoryId)"
          variant="featured"
        />
      </div>
    </section>

    <HomeConsultations :services="services.data.value" />
    <HomeHowItWorks />
    <HomeReviews :reviews="reviews" :services="services.data.value" />

    <section class="container faq-section">
      <div>
        <div class="eyebrow">{{ t('home.faq.eyebrow') }}</div>
        <h2 class="section-title faq-title">{{ t('home.faq.title') }}</h2>
        <p class="faq-lead">{{ t('home.faq.lead') }}</p>
        <div class="faq-ctas">
          <UiButton variant="secondary" to="/faq">{{ t('home.faq.all') }}</UiButton>
          <UiButton variant="ghost" to="/contact">{{ t('nav.contact') }}</UiButton>
        </div>
      </div>
      <SharedFaqAccordion :items="homeFaq" />
    </section>
  </div>
</template>

<style scoped>
.section { padding-top: clamp(48px, 8vw, 96px); }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 20px; }
.faq-section {
  padding-block: clamp(48px, 8vw, 96px);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: clamp(24px, 5vw, 64px);
}
.faq-title { margin-bottom: 16px; }
.faq-lead { font-size: 16px; line-height: 1.8; margin: 0 0 20px; }
.faq-ctas { display: flex; gap: 10px; flex-wrap: wrap; }
</style>
