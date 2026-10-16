<script setup lang="ts">
import { Search } from '@lucide/vue'
import { resolveServicePrice } from '#shared/domain/pricing'
import type { PillNavItem } from '~/components/ui/UiPillNav.vue'
import type { CategoryNavItem } from '~/components/services/CategoryNav.vue'
import type { ServiceSummary } from '~/repositories/catalog'

/**
 * Directory listing for /services, /services/:category and /services/:category/:sub.
 * Filters live in the URL query (shareable, survive refresh). Prices used for sorting and
 * filtering are the prices in force right now (launch price while the offer is active).
 */
const props = defineProps<{ categorySlug: string | null, subSlug?: string | null }>()

const { t, locale } = useI18n()
const f = useFormat()
const route = useRoute()
const router = useRouter()
const runtime = useRuntimeConfig()
const { categories, services, topCategories, subCategoriesOf, categoryLabel, servicesIn, resolve } = useCatalog()
const { active: launchActive } = useLaunchCampaign()

const resolved = computed(() => (props.categorySlug ? resolve(props.categorySlug, props.subSlug) : { top: null, sub: null, valid: true }))
const top = computed(() => resolved.value.top)
const sub = computed(() => resolved.value.sub)
const current = computed(() => sub.value ?? top.value)
const subs = computed(() => (top.value ? subCategoriesOf(top.value.id) : []))

const q = computed({
  get: () => (typeof route.query.q === 'string' ? route.query.q : ''),
  set: v => updateQuery({ q: v || undefined }),
})
const price = computed({
  get: () => (route.query.price === 'fixed' || route.query.price === 'quote' ? route.query.price : 'all'),
  set: v => updateQuery({ price: v === 'all' ? undefined : v }),
})
const sort = computed({
  get: () => (route.query.sort === 'asc' || route.query.sort === 'desc' ? route.query.sort : 'popular'),
  set: v => updateQuery({ sort: v === 'popular' ? undefined : v }),
})
const RANGES = { 'lt1000': [0, 100000], '1000-2000': [100000, 200000], '2000-3500': [200000, 350000], 'gte3500': [350000, Infinity] } as const
type RangeKey = keyof typeof RANGES
const range = computed({
  get: () => (typeof route.query.range === 'string' && route.query.range in RANGES ? (route.query.range as RangeKey) : ''),
  set: (v: string | null) => updateQuery({ range: v || undefined }),
})
/** `?offer=launch` — only the services the launch offer applies to (ignored when no offer is running). */
const offerOnly = computed({
  get: () => route.query.offer === 'launch',
  set: v => updateQuery({ offer: v ? 'launch' : undefined }),
})

function updateQuery(patch: Record<string, string | undefined>) {
  router.replace({ query: { ...route.query, ...patch } })
}

const searchDraft = shallowRef(q.value)
watch(q, (v) => {
  searchDraft.value = v
})

const currentPrice = (s: ServiceSummary) => resolveServicePrice(s, launchActive.value).currentMinor

const base = computed(() => (current.value ? servicesIn(current.value.id) : services.data.value))

const results = computed(() => {
  const needle = q.value.trim().toLowerCase()
  let list = base.value
  if (needle) {
    list = list.filter(s =>
      [s.title.ar, s.title.en ?? '', s.shortDescription.ar, s.shortDescription.en ?? ''].some(x => x.toLowerCase().includes(needle)),
    )
  }
  if (price.value !== 'all') list = list.filter(s => s.pricingType === price.value)
  if (range.value) {
    const [min, max] = RANGES[range.value]
    list = list.filter(s => currentPrice(s) >= min && currentPrice(s) < max)
  }
  if (offerOnly.value && launchActive.value) list = list.filter(s => resolveServicePrice(s, true).isLaunch)
  if (sort.value === 'asc') list = [...list].sort((a, b) => currentPrice(a) - currentPrice(b))
  if (sort.value === 'desc') list = [...list].sort((a, b) => currentPrice(b) - currentPrice(a))
  return list
})

const filtering = computed(() => !!(q.value.trim() || price.value !== 'all' || range.value || offerOnly.value || sort.value !== 'popular'))

/** Top-level view without filters: contracts grouped under their sub-category headings. */
const grouped = computed(() => {
  if (!top.value || sub.value || filtering.value || !subs.value.length) return null
  const out = subs.value
    .map(c => ({ id: c.id, slug: c.slug, title: f.text(c.title), items: results.value.filter(s => s.primaryCategoryId === c.id) }))
    .filter(g => g.items.length)
  const subIds = new Set(subs.value.map(c => c.id))
  const others = results.value.filter(s => !subIds.has(s.primaryCategoryId))
  if (others.length) out.push({ id: 'other', slug: '', title: t('directory.otherServices'), items: others })
  return out
})

const tabs = computed<PillNavItem[]>(() => [
  { id: 'all', label: t('directory.all'), to: { path: '/services', query: route.query } },
  ...topCategories.value.map(c => ({ id: c.slug, label: f.text(c.title), to: { path: `/services/${c.slug}`, query: route.query } })),
])

const subNav = computed<CategoryNavItem[]>(() => {
  if (!top.value) return []
  return [
    { id: 'all', label: t('directory.allIn', { category: f.text(top.value.title) }), count: servicesIn(top.value.id).length, to: { path: `/services/${top.value.slug}`, query: route.query } },
    ...subs.value.map(c => ({ id: c.slug, label: f.text(c.title), count: servicesIn(c.id).length, to: { path: `/services/${top.value!.slug}/${c.slug}`, query: route.query } })),
  ]
})

const priceFilters = computed(() => [
  { id: 'all' as const, label: t('directory.priceAll') },
  { id: 'fixed' as const, label: t('directory.priceFixed') },
  { id: 'quote' as const, label: t('directory.priceQuote') },
])
const sortOptions = computed(() => [
  { value: 'popular', label: t('directory.sortPopular') },
  { value: 'asc', label: t('directory.sortAsc') },
  { value: 'desc', label: t('directory.sortDesc') },
])
const rangeOptions = computed(() => (Object.keys(RANGES) as RangeKey[]).map(k => ({ value: k, label: t(`directory.range.${k}`) })))

const title = computed(() => (current.value ? f.text(current.value.title) : t('directory.allTitle')))
const description = computed(() => (current.value ? f.text(current.value.description) : t('directory.allDescription')))
const loading = computed(() => services.status.value === 'pending' || categories.status.value === 'pending')

function clearFilters() {
  router.replace({ query: {} })
}

const canonical = computed(() => {
  const prefix = locale.value === 'en' ? '/en' : ''
  const path = ['/services', props.categorySlug, props.subSlug].filter(Boolean).join('/')
  return `${runtime.public.siteUrl}${prefix}${path}`
})

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
})
useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [{
    type: 'application/ld+json',
    innerHTML: () => JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': t('nav.home'), 'item': runtime.public.siteUrl },
        ...(top.value ? [{ '@type': 'ListItem', 'position': 2, 'name': f.text(top.value.title), 'item': `${runtime.public.siteUrl}/services/${top.value.slug}` }] : []),
        ...(sub.value && top.value ? [{ '@type': 'ListItem', 'position': 3, 'name': f.text(sub.value.title), 'item': `${runtime.public.siteUrl}/services/${top.value.slug}/${sub.value.slug}` }] : []),
      ],
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
          <template v-if="top && sub">
            <NuxtLinkLocale :to="`/services/${top.slug}`">{{ f.text(top.title) }}</NuxtLinkLocale> / <span>{{ title }}</span>
          </template>
          <span v-else>{{ title }}</span>
        </nav>
        <h1 class="page-title">{{ title }}</h1>
        <p class="desc">{{ description }}</p>
        <div class="tabs-scroll">
          <UiPillNav :items="tabs" :active-id="categorySlug ?? 'all'" :aria-label="t('directory.categoriesLabel')" />
        </div>
        <ServicesCategoryNav
          v-if="subNav.length > 1"
          :items="subNav"
          :active-id="subSlug ?? 'all'"
          :nav-label="t('directory.subcategoriesLabel')"
        />
      </div>
    </section>

    <section class="container body">
      <div class="filters">
        <form class="search" role="search" @submit.prevent="q = searchDraft">
          <Search :size="18" :stroke-width="1.8" class="search-icon" aria-hidden="true" />
          <input
            v-model="searchDraft"
            type="search"
            :placeholder="t('directory.searchPlaceholder')"
            :aria-label="t('directory.searchPlaceholder')"
            @change="q = searchDraft"
          >
        </form>
        <div class="price-filters" role="group" :aria-label="t('directory.priceLabel')">
          <button
            v-for="p in priceFilters"
            :key="p.id"
            type="button"
            class="pill"
            :aria-pressed="price === p.id"
            @click="price = p.id"
          >
            {{ p.label }}
          </button>
          <button v-if="launchActive" type="button" class="pill pill--offer" :aria-pressed="offerOnly" @click="offerOnly = !offerOnly">
            {{ t('directory.offerOnly') }}
          </button>
        </div>
        <div class="select">
          <UiSelect v-model="range" :options="rangeOptions" :placeholder="t('directory.rangeAll')" :aria-label="t('directory.rangeLabel')" />
        </div>
        <div class="select">
          <UiSelect v-model="sort" :options="sortOptions" :aria-label="t('directory.sortLabel')" />
        </div>
      </div>

      <div class="count" aria-live="polite">
        {{ loading ? t('common.loading') : t('directory.resultCount', { n: f.number(results.length) }) }}
      </div>

      <div v-if="loading" class="grid">
        <UiSkeletonCard v-for="n in 6" :key="n" />
      </div>
      <template v-else-if="results.length && grouped">
        <section v-for="g in grouped" :key="g.id" class="group">
          <h2 class="group-title">
            <NuxtLinkLocale v-if="g.slug && top" :to="`/services/${top.slug}/${g.slug}`">{{ g.title }}</NuxtLinkLocale>
            <template v-else>{{ g.title }}</template>
            <span class="group-count">{{ f.number(g.items.length) }}</span>
          </h2>
          <div class="grid">
            <ServicesServiceCard v-for="s in g.items" :key="s.id" :service="s" :category-label="categoryLabel(s.primaryCategoryId)" />
          </div>
        </section>
      </template>
      <div v-else-if="results.length" class="grid">
        <ServicesServiceCard
          v-for="s in results"
          :key="s.id"
          :service="s"
          :category-label="categoryLabel(s.primaryCategoryId)"
        />
      </div>
      <UiEmptyState v-else :title="t('directory.emptyTitle')" :description="t('directory.emptyText')">
        <UiButton variant="secondary" @click="clearFilters">{{ t('directory.clear') }}</UiButton>
        <UiButton to="/service/written-consultation">{{ t('footer.writtenConsultation') }}</UiButton>
      </UiEmptyState>
    </section>
  </div>
</template>

<style scoped>
.intro { background: #fff; border-bottom: 1px solid var(--border-subtle); }
.intro-inner { padding-block: clamp(28px, 5vw, 56px) 24px; display: flex; flex-direction: column; gap: 18px; }
.crumbs { font-size: 13px; color: var(--text-muted); }
.desc { margin: 0; font-size: 16px; max-width: 640px; line-height: 1.8; }
.tabs-scroll { overflow-x: auto; overflow-y: hidden; padding-bottom: 4px; }
.body { padding-block: 24px 80px; display: flex; flex-direction: column; gap: 20px; }
.filters { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.search {
  flex: 1 1 280px; display: flex; align-items: center; gap: 8px; background: #fff;
  border: 1.5px solid var(--border-default); border-radius: 12px; padding: 0 12px;
}
.search:focus-within { border-color: var(--accent); box-shadow: var(--shadow-focus); }
.search-icon { color: var(--text-muted); flex-shrink: 0; }
.search input { flex: 1; border: none; outline: none; font-size: 15px; padding: 12px 0; background: transparent; min-width: 0; }
.price-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.pill {
  border: 1px solid var(--border-default); background: #fff; color: var(--text-body);
  border-radius: 999px; padding: 9px 16px; font-size: 14px; cursor: pointer;
}
.pill[aria-pressed='true'] { border-color: var(--ink-900); background: var(--ink-900); color: var(--cream-100); }
.pill--offer { border-color: var(--gold-400); color: var(--gold-700); background: var(--gold-50); }
.select { width: 200px; }
.count { font-size: 14px; color: var(--text-muted); }
.group { display: flex; flex-direction: column; gap: 14px; }
.group + .group { margin-top: 12px; }
.group-title {
  display: flex; align-items: center; gap: 10px; margin: 0; font-family: var(--font-heading); font-size: 22px; font-weight: 700;
  padding-bottom: 8px; border-bottom: 1px solid var(--border-subtle);
}
.group-title a { color: var(--text-strong); }
.group-count { font-size: 13px; font-weight: 700; color: var(--text-muted); background: var(--neutral-100); border-radius: 999px; padding: 2px 10px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 20px; }
@media (max-width: 719px) {
  .select { width: 100%; flex: 1 1 100%; }
}
</style>
