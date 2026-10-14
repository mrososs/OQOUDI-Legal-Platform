<script setup lang="ts">
withDefaults(defineProps<{
  eyebrow?: string
  title: string
  as?: 'h1' | 'h2'
}>(), { as: 'h2' })
</script>

<template>
  <div class="heading">
    <div>
      <div v-if="eyebrow" class="eyebrow">{{ eyebrow }}</div>
      <component :is="as" class="section-title">{{ title }}</component>
    </div>
    <div v-if="$slots.default" class="aside"><slot /></div>
  </div>
</template>

<style scoped>
.heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 28px;
}
.aside { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
</style>
