import type { Database } from '#shared/types/database.types'
import { fetchCategories, fetchPublishedServices, type Category } from '~/repositories/catalog'

/** Published catalog (categories + services), shared across public pages via the payload cache. */
export function useCatalog() {
  const supabase = useSupabaseClient<Database>()
  const f = useFormat()

  const categories = useAsyncData('catalog:categories', () => fetchCategories(supabase), { default: () => [] as Category[] })
  const services = useAsyncData('catalog:services', () => fetchPublishedServices(supabase), { default: () => [] })

  const categoryById = computed(() => new Map(categories.data.value.map(c => [c.id, c])))
  const categoryLabel = (id: string) => f.text(categoryById.value.get(id)?.title)

  return { categories, services, categoryById, categoryLabel }
}
