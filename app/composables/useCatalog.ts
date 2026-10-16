import type { Database } from '#shared/types/database.types'
import { fetchCategories, fetchPublishedServices, type Category, type ServiceSummary } from '~/repositories/catalog'

/**
 * Published catalog (categories + services), shared across public pages via the payload cache.
 *
 * Categories are two levels: top-level (individuals / companies / consultations) and their
 * sub-categories. A service's `categoryIds` always contains its primary (most specific)
 * category AND that category's parent, so filtering by either level is exact.
 */
export function useCatalog() {
  const supabase = useSupabaseClient<Database>()
  const f = useFormat()

  const categories = useAsyncData('catalog:categories', () => fetchCategories(supabase), { default: () => [] as Category[] })
  const services = useAsyncData('catalog:services', () => fetchPublishedServices(supabase), { default: () => [] as ServiceSummary[] })

  const categoryById = computed(() => new Map(categories.data.value.map(c => [c.id, c])))
  const topCategories = computed(() => categories.data.value.filter(c => !c.parentId))
  const subCategoriesOf = (parentId: string) => categories.data.value.filter(c => c.parentId === parentId)

  /** Label of a category; for a sub-category the parent is not repeated. */
  const categoryLabel = (id: string) => f.text(categoryById.value.get(id)?.title)

  /** Services listed under a category (any level), by link membership. */
  const servicesIn = (categoryId: string) => services.data.value.filter(s => s.categoryIds.includes(categoryId))

  /** Contracts of a top-level category = services whose primary category is one of its sub-categories. */
  const contractCount = (topId: string) => {
    const subIds = new Set(subCategoriesOf(topId).map(c => c.id))
    return services.data.value.filter(s => subIds.has(s.primaryCategoryId)).length
  }

  /** Resolves `/services/:category/:sub?` slugs to categories (null when unknown or not parent/child). */
  function resolve(topSlug: string, subSlug?: string | null) {
    const top = topCategories.value.find(c => c.slug === topSlug) ?? null
    if (!top) return { top: null, sub: null, valid: false }
    if (!subSlug) return { top, sub: null, valid: true }
    const sub = subCategoriesOf(top.id).find(c => c.slug === subSlug) ?? null
    return { top, sub, valid: !!sub }
  }

  return { categories, services, categoryById, topCategories, subCategoriesOf, categoryLabel, servicesIn, contractCount, resolve }
}
