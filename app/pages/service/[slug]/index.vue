<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { fetchPublicReviews, fetchServiceBySlug } from '~/repositories/catalog'

const route = useRoute()
const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const { categoryById } = useCatalog()
const runtime = useRuntimeConfig()

const slug = computed(() => String(route.params.slug))
const { data: service } = await useAsyncData(`service:${slug.value}`, () => fetchServiceBySlug(supabase, slug.value))
if (!service.value) {
  throw createError({ statusCode: 404, statusMessage: 'Service not found', fatal: true })
}
const { data: reviews } = await useAsyncData(
  `service-reviews:${slug.value}`,
  () => fetchPublicReviews(supabase, { serviceId: service.value!.id, limit: 10 }),
  { default: () => [] },
)

const addons = ref<string[]>([])
const svc = computed(() => service.value!)
const category = computed(() => categoryById.value.get(svc.value.primaryCategoryId))
const ratingText = computed(() =>
  svc.value.rating
    ? `${f.number(svc.value.rating.avg)} ${t('services.ratingCount', { n: f.number(svc.value.rating.count) })}`
    : t('services.newService'),
)

useSeoMeta({
  title: () => f.text(svc.value.title),
  description: () => f.text(svc.value.shortDescription),
  ogTitle: () => f.text(svc.value.title),
  ogDescription: () => f.text(svc.value.shortDescription),
})

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: () => JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': f.text(svc.value.title),
      'description': f.text(svc.value.shortDescription),
      'provider': { '@type': 'LegalService', 'name': t('brand.name'), 'url': runtime.public.siteUrl },
      'areaServed': 'EG',
      'offers': {
        '@type': 'Offer',
        'priceCurrency': 'EGP',
        'price': (svc.value.basePriceMinor / 100).toFixed(2),
      },
    }),
  }],
})
</script>

<template>
  <div>
    <section class="intro">
      <div class="container intro-inner">
        <nav class="crumbs" :aria-label="t('common.breadcrumbs')">
          <NuxtLinkLocale to="/">{{ t('nav.home') }}</NuxtLinkLocale> /
          <NuxtLinkLocale v-if="category" :to="`/services/${category.slug}`">{{ f.text(category.title) }}</NuxtLinkLocale> /
          <span>{{ f.text(svc.title) }}</span>
        </nav>
        <h1 class="title">{{ f.text(svc.title) }}</h1>
        <p class="short">{{ f.text(svc.shortDescription) }}</p>
        <div class="meta">
          <span><span class="star" aria-hidden="true">★</span> <strong>{{ ratingText }}</strong></span>
          <span class="sep" aria-hidden="true">|</span>
          <span>{{ t('services.durationLabel') }} <strong>{{ f.text(svc.deliveryEstimate) }}</strong></span>
          <UiBadge v-if="svc.pricingType === 'quote'" tone="caution">{{ t('services.quoteBadge') }}</UiBadge>
        </div>
      </div>
    </section>

    <section class="container body">
      <div class="main-col">
        <ServicesServiceSectionCards :service="svc" :reviews="reviews" />
      </div>
      <ServicesServicePriceAside v-model:addons="addons" :service="svc" />
    </section>
  </div>
</template>

<style scoped>
.intro { background: #fff; border-bottom: 1px solid var(--border-subtle); }
.intro-inner { padding-block: clamp(24px, 4vw, 48px) 32px; display: flex; flex-direction: column; gap: 14px; }
.crumbs { font-size: 13px; color: var(--text-muted); }
.title { font-size: clamp(28px, 4vw, 46px); font-weight: 800; margin: 0; }
.short { margin: 0; font-size: 18px; line-height: 1.8; max-width: 720px; }
.meta { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; font-size: 14px; }
.meta strong { color: var(--text-strong); }
.star { color: var(--gold-400); }
.sep { color: var(--neutral-300); }
.body { padding-block: 32px 96px; display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start; }
.main-col { flex: 1 1 560px; min-width: 0; }
</style>
