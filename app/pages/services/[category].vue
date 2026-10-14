<script setup lang="ts">
const route = useRoute()
const { categories } = useCatalog()
await categories

const slug = computed(() => String(route.params.category))
if (!categories.data.value.some(c => c.slug === slug.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })
}
</script>

<template>
  <ServicesDirectory :category-slug="slug" />
</template>
