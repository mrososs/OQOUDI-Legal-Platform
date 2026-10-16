<script setup lang="ts">
import { Languages, Zap } from '@lucide/vue'
import type { Database } from '#shared/types/database.types'
import { resolveAddonPrice, resolveServicePrice } from '#shared/domain/pricing'
import { fetchPublicReviews, fetchPublishedForm, fetchServiceBySlug } from '~/repositories/catalog'

const route = useRoute()
const { t, locale } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const { categoryById } = useCatalog()
const runtime = useRuntimeConfig()
const { active: launchActive, endsAt } = useLaunchCampaign()

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
const { data: form } = await useAsyncData(`service-form:${slug.value}`, () => fetchPublishedForm(supabase, service.value!.id))

const addons = ref<string[]>([])
const svc = computed(() => service.value!)

/** Most specific category, and its parent when it is a sub-category. */
const category = computed(() => categoryById.value.get(svc.value.primaryCategoryId))
const parentCategory = computed(() => (category.value?.parentId ? categoryById.value.get(category.value.parentId) : undefined))
const topSlug = computed(() => (parentCategory.value ?? category.value)?.slug)
const subUrl = computed(() => (parentCategory.value && category.value ? `/services/${parentCategory.value.slug}/${category.value.slug}` : null))

const ratingText = computed(() =>
  svc.value.rating
    ? `${f.number(svc.value.rating.avg)} ${t('services.ratingCount', { n: f.number(svc.value.rating.count) })}`
    : t('services.newService'),
)

/** Optional paid add-ons that have a price in force right now. */
const availableKinds = computed(() => new Set(svc.value.addons
  .filter(a => resolveAddonPrice(a, svc.value, launchActive.value).available)
  .map(a => a.kind)))
const hasVip = computed(() => availableKinds.value.has('vip_delivery'))
const hasBilingual = computed(() => availableKinds.value.has('bilingual_drafting'))

const price = computed(() => resolveServicePrice(svc.value, launchActive.value))

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
        'price': (price.value.currentMinor / 100).toFixed(2),
        ...(price.value.isLaunch && endsAt.value ? { priceValidUntil: endsAt.value } : {}),
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
          <template v-if="parentCategory">
            <NuxtLinkLocale :to="`/services/${parentCategory.slug}`">{{ f.text(parentCategory.title) }}</NuxtLinkLocale> /
            <NuxtLinkLocale v-if="subUrl && category" :to="subUrl">{{ f.text(category.title) }}</NuxtLinkLocale> /
          </template>
          <template v-else-if="category && topSlug">
            <NuxtLinkLocale :to="`/services/${topSlug}`">{{ f.text(category.title) }}</NuxtLinkLocale> /
          </template>
          <span>{{ f.text(svc.title) }}</span>
        </nav>
        <ServicesLaunchBadge :service="svc" class="launch-badge" />
        <h1 class="title">{{ f.text(svc.title) }}</h1>
        <p class="short">{{ f.text(svc.shortDescription) }}</p>
        <div class="meta">
          <span><span class="star" aria-hidden="true">★</span> <strong>{{ ratingText }}</strong></span>
          <span class="sep" aria-hidden="true">|</span>
          <span>{{ t('services.durationLabel') }} <strong>{{ f.text(svc.deliveryEstimate) }}</strong></span>
          <UiBadge v-if="svc.pricingType === 'quote'" tone="caution">{{ t('services.quoteBadge') }}</UiBadge>
        </div>
        <div v-if="hasVip || hasBilingual" class="chips">
          <span v-if="hasVip" class="chip"><Zap :size="14" :stroke-width="2" aria-hidden="true" /> {{ t('services.vipAvailable') }}</span>
          <span v-if="hasBilingual" class="chip"><Languages :size="14" :stroke-width="2" aria-hidden="true" /> {{ t('services.bilingualAvailable') }}</span>
        </div>
        <p v-if="locale === 'en' && svc.translationPending" class="pending-note">{{ t('services.translationPending') }}</p>
      </div>
    </section>

    <section class="container body">
      <div class="main-col">
        <ServicesServiceRequirements v-if="form" :fields="form.fields" />
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
.launch-badge { align-self: flex-start; }
.title { font-size: clamp(28px, 4vw, 46px); font-weight: 800; margin: 0; }
.short { margin: 0; font-size: 18px; line-height: 1.8; max-width: 720px; }
.meta { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; font-size: 14px; }
.meta strong { color: var(--text-strong); }
.star { color: var(--gold-400); }
.sep { color: var(--neutral-300); }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--ink-900);
  background: var(--gold-50); border: 1px solid var(--gold-200); border-radius: 999px; padding: 4px 12px;
}
.chip svg { color: var(--gold-500); }
.pending-note { margin: 0; font-size: 12px; color: var(--text-muted); max-width: 720px; }
.body { padding-block: 32px 96px; display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start; }
.main-col { flex: 1 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
</style>
