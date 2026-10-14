<script setup lang="ts">
const { t } = useI18n()
const f = useFormat()
const steps = computed(() => [1, 2, 3, 4].map(n => ({
  n: f.number(n),
  title: t(`home.how.step${n}.title`),
  text: t(`home.how.step${n}.text`),
})))
</script>

<template>
  <section class="container section">
    <div class="eyebrow">{{ t('home.how.eyebrow') }}</div>
    <h2 class="section-title heading">{{ t('home.how.title') }}</h2>
    <div class="grid">
      <div v-for="s in steps" :key="s.n" class="step">
        <div class="num">{{ s.n }}</div>
        <div class="title">{{ s.title }}</div>
        <div class="text">{{ s.text }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section { padding-top: clamp(48px, 8vw, 96px); }
.heading { margin-bottom: 32px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); border-top: 1px solid var(--border-default); }
.step { padding: 24px 0 0; padding-inline-end: 24px; display: flex; flex-direction: column; gap: 10px; }
.num { font-family: var(--font-heading); font-size: 32px; font-weight: 800; color: var(--gold-400); }
.title { font-size: 18px; font-weight: 700; color: var(--text-strong); }
.text { font-size: 14px; line-height: 1.7; color: var(--text-body); }
</style>
