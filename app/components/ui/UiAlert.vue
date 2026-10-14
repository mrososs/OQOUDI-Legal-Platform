<script setup lang="ts">
withDefaults(defineProps<{
  tone?: 'critical' | 'caution' | 'positive' | 'info'
  title?: string
}>(), { tone: 'critical' })
</script>

<template>
  <div class="alert" :class="`alert--${tone}`" :role="tone === 'critical' ? 'alert' : 'status'">
    <strong v-if="title" class="alert-title">{{ title }}</strong>
    <div class="alert-body"><slot /></div>
  </div>
</template>

<style scoped>
.alert {
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 14px;
  line-height: 1.7;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.alert--critical { background: var(--critical-100); color: var(--critical-500); }
.alert--caution { background: var(--caution-100); color: var(--caution-500); }
.alert--positive { background: var(--positive-100); color: var(--positive-500); }
.alert--info { background: var(--gold-50); color: var(--text-body); border: 1px solid var(--gold-200); }
.alert-title { font-weight: 700; }
.alert-body { color: inherit; }
.alert--critical .alert-body { font-weight: 600; }
</style>
