<script setup lang="ts">
import type { PublicReview, ServiceSummary } from '~/repositories/catalog'

const props = defineProps<{
  reviews: PublicReview[]
  services: ServiceSummary[]
}>()

const { t } = useI18n()
const f = useFormat()

const overall = computed(() => {
  const rated = props.services.filter(s => s.rating)
  const count = rated.reduce((n, s) => n + (s.rating?.count ?? 0), 0)
  const sum = rated.reduce((n, s) => n + (s.rating?.avg ?? 0) * (s.rating?.count ?? 0), 0)
  return { count, avg: count ? Math.round((sum / count) * 10) / 10 : 0 }
})
const serviceTitle = (id: string) => f.text(props.services.find(s => s.id === id)?.title)
</script>

<template>
  <section class="container section">
    <SharedSectionHeading :eyebrow="t('home.reviews.eyebrow')" :title="t('home.reviews.title')">
      <div v-if="overall.count" class="overall">
        <span class="star" aria-hidden="true">★</span>
        <strong>{{ f.number(overall.avg) }}</strong> {{ t('home.reviews.outOf5') }} · {{ t('home.reviews.count', { n: f.number(overall.count) }) }}
      </div>
    </SharedSectionHeading>
    <div v-if="reviews.length" class="grid">
      <figure v-for="r in reviews" :key="r.id" class="kh-card review">
        <SharedStarRating :value="r.rating" />
        <blockquote class="text">{{ r.comment }}</blockquote>
        <figcaption class="by">{{ r.displayName }} · {{ serviceTitle(r.serviceId) }}</figcaption>
      </figure>
    </div>
    <p v-else class="muted">{{ t('home.reviews.empty') }}</p>
  </section>
</template>

<style scoped>
.section { padding-top: clamp(48px, 8vw, 96px); }
.overall { font-size: 15px; color: var(--text-body); }
.overall strong { color: var(--text-strong); }
.star { color: var(--gold-400); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 20px; }
.review { margin: 0; display: flex; flex-direction: column; gap: 14px; }
.text { margin: 0; font-size: 16px; line-height: 1.8; color: var(--text-strong); }
.by { font-size: 13px; color: var(--text-muted); margin-top: auto; }
</style>
