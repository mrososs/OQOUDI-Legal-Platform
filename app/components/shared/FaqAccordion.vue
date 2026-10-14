<script setup lang="ts">
export interface FaqItem {
  id: string
  question: string
  answer: string
}

withDefaults(defineProps<{
  items: FaqItem[]
  size?: 'md' | 'lg'
}>(), { size: 'lg' })

const open = ref<Set<string>>(new Set())

function toggle(id: string) {
  const next = new Set(open.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  open.value = next
}
</script>

<template>
  <div class="faq" :class="`faq--${size}`">
    <div v-for="f in items" :key="f.id" class="item">
      <h3 class="q-wrap">
        <button
          type="button"
          class="q"
          :aria-expanded="open.has(f.id)"
          :aria-controls="`faq-${f.id}`"
          @click="toggle(f.id)"
        >
          <span>{{ f.question }}</span>
          <span class="sign" aria-hidden="true">{{ open.has(f.id) ? '−' : '+' }}</span>
        </button>
      </h3>
      <p v-show="open.has(f.id)" :id="`faq-${f.id}`" class="a">{{ f.answer }}</p>
    </div>
  </div>
</template>

<style scoped>
.faq { display: flex; flex-direction: column; border-top: 1px solid var(--border-default); }
.item { border-bottom: 1px solid var(--border-default); }
.q-wrap { margin: 0; font-size: inherit; }
.q {
  width: 100%; display: flex; justify-content: space-between; gap: 16px; align-items: center;
  padding: 20px 0; background: none; border: none; font-size: 17px; font-weight: 600;
  color: var(--text-strong); text-align: start; cursor: pointer; font-family: var(--font-sans);
}
.faq--md .q { padding: 14px 0; font-size: 16px; }
.sign { font-size: 22px; color: var(--gold-600); flex-shrink: 0; }
.a { margin: 0; padding: 0 0 20px; font-size: 15px; line-height: 1.8; color: var(--text-body); }
.faq--md { border-top: none; }
.faq--md .item { border-bottom-color: var(--border-subtle); }
</style>
