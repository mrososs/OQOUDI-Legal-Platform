<script setup lang="ts">
import { Search } from '@lucide/vue'
import type { PillNavItem } from '~/components/ui/UiPillNav.vue'

/** Directory listing. Filters live in the URL query (shareable, survive refresh). */
const props = defineProps<{ categorySlug: string | null }>()

const { t } = useI18n()
const f = useFormat()
const route = useRoute()
const router = useRouter()
const { categories, services, categoryLabel } = useCatalog()

const category = computed(() => categories.data.value.find(c => c.slug === props.categorySlug) ?? null)

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

function updateQuery(patch: Record<string, string | undefined>) {
  router.replace({ query: { ...route.query, ...patch } })
}

const searchDraft = shallowRef(q.value)
watch(q, (v) => {
  searchDraft.value = v
})

const results = computed(() => {
  const needle = q.value.trim().toLowerCase()
  let list = services.data.value.filter(s => !category.value || s.categoryIds.includes(category.value.id))
  if (needle) {
    list = list.filter(s =>
      [s.title.ar, s.title.en ?? '', s.shortDescription.ar, s.shortDescription.en ?? ''].some(x => x.toLowerCase().includes(needle)),
    )
  }
  if (price.value !== 'all') list = list.filter(s => s.pricingType === price.value)
  if (sort.value === 'asc') list = [...list].sort((a, b) => a.basePriceMinor - b.basePriceMinor)
  if (sort.value === 'desc') list = [...list].sort((a, b) => b.basePriceMinor - a.basePriceMinor)
  return list
})

const tabs = computed<PillNavItem[]>(() => [
  { id: 'all', label: t('directory.all'), to: { path: '/services', query: route.query } },
  ...categories.data.value.map(c => ({ id: c.slug, label: f.text(c.title), to: { path: `/services/${c.slug}`, query: route.query } })),
])
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

const title = computed(() => (category.value ? f.text(category.value.title) : t('directory.allTitle')))
const description = computed(() => (category.value ? f.text(category.value.description) : t('directory.allDescription')))
const loading = computed(() => services.status.value === 'pending' || categories.status.value === 'pending')

function clearFilters() {
  router.replace({ query: {} })
}

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
})
</script>

<template>
  <div>
    <section class="intro">
      <div class="container intro-inner">
        <nav class="crumbs" :aria-label="t('common.breadcrumbs')">
          <NuxtLinkLocale to="/">{{ t('nav.home') }}</NuxtLinkLocale> / <span>{{ title }}</span>
        </nav>
        <h1 class="page-title">{{ title }}</h1>
        <p class="desc">{{ description }}</p>
        <div class="tabs-scroll">
          <UiPillNav :items="tabs" :active-id="categorySlug ?? 'all'" :aria-label="t('directory.categoriesLabel')" />
        </div>
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
        </div>
        <div class="sort">
          <UiSelect v-model="sort" :options="sortOptions" :aria-label="t('directory.sortLabel')" />
        </div>
      </div>

      <div class="count" aria-live="polite">
        {{ loading ? t('common.loading') : t('directory.resultCount', { n: f.number(results.length) }) }}
      </div>

      <div v-if="loading" class="grid">
        <UiSkeletonCard v-for="n in 6" :key="n" />
      </div>
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
.sort { width: 200px; }
.count { font-size: 14px; color: var(--text-muted); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 20px; }
</style>
