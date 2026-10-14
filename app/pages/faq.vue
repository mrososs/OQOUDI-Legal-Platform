<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { fetchFaq } from '~/repositories/catalog'

const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()

const { data: faq } = await useAsyncData('faq', () => fetchFaq(supabase), { default: () => [] })

const groups = computed(() => {
  const map = new Map<string, { title: string, items: { id: string, question: string, answer: string }[] }>()
  for (const e of faq.value) {
    const g = map.get(e.groupKey) ?? { title: f.text(e.groupTitle), items: [] }
    g.items.push({ id: e.id, question: f.text(e.question), answer: f.text(e.answer) })
    map.set(e.groupKey, g)
  }
  return [...map.entries()].map(([key, g]) => ({ key, ...g }))
})

useSeoMeta({ title: () => t('nav.faq'), description: () => t('faqPage.title') })
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: () => JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faq.value.map(e => ({
        '@type': 'Question',
        'name': f.text(e.question),
        'acceptedAnswer': { '@type': 'Answer', 'text': f.text(e.answer) },
      })),
    }),
  }],
})
</script>

<template>
  <section class="wrap">
    <span class="eyebrow">{{ t('nav.faq') }}</span>
    <h1 class="title">{{ t('faqPage.title') }}</h1>
    <div v-for="g in groups" :key="g.key" class="group">
      <h2 class="group-title">{{ g.title }}</h2>
      <SharedFaqAccordion :items="g.items" />
    </div>
    <div class="cta">
      <span>{{ t('faqPage.noAnswer') }}</span>
      <UiButton variant="secondary" to="/contact">{{ t('nav.contact') }}</UiButton>
    </div>
  </section>
</template>

<style scoped>
.wrap { max-width: 860px; margin: 0 auto; padding: clamp(40px, 7vw, 88px) var(--container-pad) 96px; }
.title { font-size: clamp(30px, 4vw, 44px); font-weight: 800; margin: 8px 0 32px; }
.group { margin-bottom: 32px; }
.group-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; color: var(--gold-700); }
.cta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; color: var(--text-muted); }
</style>
