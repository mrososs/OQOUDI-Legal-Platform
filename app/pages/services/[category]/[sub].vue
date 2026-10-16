<script setup lang="ts">
const route = useRoute()
const { categories, resolve } = useCatalog()
await categories

const category = computed(() => String(route.params.category))
const sub = computed(() => String(route.params.sub))
// 404 unless the sub-category exists AND belongs to that top-level category
if (!resolve(category.value, sub.value).valid) {
  throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })
}
</script>

<template>
  <ServicesDirectory :category-slug="category" :sub-slug="sub" />
</template>
