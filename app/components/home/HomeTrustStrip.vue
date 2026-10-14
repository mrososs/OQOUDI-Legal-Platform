<script setup lang="ts">
import { Check } from '@lucide/vue'

const { t } = useI18n()
const items = computed(() => ['price', 'tracking', 'delivery', 'reviews'].map(k => ({
  key: k,
  title: t(`home.trust.${k}.title`),
  text: t(`home.trust.${k}.text`),
})))
</script>

<template>
  <section class="strip">
    <div class="grid container">
      <div v-for="i in items" :key="i.key" class="item">
        <div class="tick" aria-hidden="true"><Check :size="18" :stroke-width="1.8" /></div>
        <div>
          <div class="title">{{ i.title }}</div>
          <div class="text">{{ i.text }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.strip { border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); background: #fff; }
.grid { padding-block: 28px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; }
.item { display: flex; gap: 12px; align-items: flex-start; }
.tick {
  width: 36px; height: 36px; border-radius: 10px; background: var(--gold-50); border: 1px solid var(--gold-200);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--gold-600);
}
.title { font-weight: 600; color: var(--text-strong); font-size: 15px; }
.text { font-size: 13px; color: var(--text-muted); line-height: 1.6; }
</style>
