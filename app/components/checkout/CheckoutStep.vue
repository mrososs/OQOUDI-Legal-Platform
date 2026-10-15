<script setup lang="ts">
/** Numbered checkout section (step badge + title + content). */
defineProps<{ step: number, title: string, done?: boolean, muted?: boolean }>()
const f = useFormat()
</script>

<template>
  <section class="kh-card step" :class="{ muted }">
    <h2 class="head">
      <span class="num" :class="{ done }" aria-hidden="true">{{ f.number(step) }}</span>
      <span>{{ title }}</span>
    </h2>
    <div class="content"><slot /></div>
  </section>
</template>

<style scoped>
.step { display: flex; flex-direction: column; gap: 16px; }
.step.muted { opacity: 0.6; }
.head { display: flex; align-items: center; gap: 12px; font-size: 18px; font-weight: 800; margin: 0; }
.num {
  width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  background: var(--neutral-100); color: var(--text-strong); font-size: 14px; border: 1.5px solid var(--border-default);
}
.num.done { background: var(--ink-900); color: var(--cream-100); border-color: var(--ink-900); }
.content { display: flex; flex-direction: column; gap: 14px; }
</style>
