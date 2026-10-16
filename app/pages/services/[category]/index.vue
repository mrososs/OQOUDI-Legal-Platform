<script setup lang="ts">
const route = useRoute()
const { categories, resolve } = useCatalog()
await categories

const slug = computed(() => String(route.params.category))
if (!resolve(slug.value).valid) {
  throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })
}
</script>

<template>
  <ServicesDirectory :category-slug="slug" />
</template>
