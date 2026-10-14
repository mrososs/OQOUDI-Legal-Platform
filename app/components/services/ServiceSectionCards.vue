<script setup lang="ts">
import { Check, Clock } from '@lucide/vue'
import type { PublicReview, ServiceDetail } from '~/repositories/catalog'
import type { Localized } from '#shared/domain/localized'
import { LIST_SECTIONS } from '#shared/domain/serviceSections'

const props = defineProps<{
  service: ServiceDetail
  reviews: PublicReview[]
}>()

const { t } = useI18n()
const f = useFormat()

interface SectionVM {
  key: string
  anchor: string
  title: string
  kind: 'text' | 'list' | 'steps' | 'duration' | 'pricing' | 'faq' | 'reviews'
  text?: string
  items?: string[]
  faqs?: { id: string, question: string, answer: string }[]
}

const sections = computed<SectionVM[]>(() => {
  const out: SectionVM[] = []
  for (const s of props.service.sections) {
    const base = { key: s.key, anchor: `sec-${s.key}`, title: t(`sections.${s.key}`) }
    if (s.key === 'about') {
      const text = f.text(s.content as Localized)
      if (text) out.push({ ...base, kind: 'text', text })
    }
    else if (LIST_SECTIONS.includes(s.key) || s.key === 'steps') {
      const items = Array.isArray(s.content) ? (s.content as Localized[]).map(x => f.text(x)).filter(Boolean) : []
      if (items.length) out.push({ ...base, kind: s.key === 'steps' ? 'steps' : 'list', items })
    }
    else if (s.key === 'faq') {
      const faqs = Array.isArray(s.content)
        ? (s.content as { q: Localized, a: Localized }[]).map((x, i) => ({ id: `svc-${i}`, question: f.text(x.q), answer: f.text(x.a) }))
        : []
      if (faqs.length) out.push({ ...base, kind: 'faq', faqs })
    }
    else if (s.key === 'duration' || s.key === 'pricing' || s.key === 'reviews') {
      out.push({ ...base, kind: s.key })
    }
  }
  return out
})

const priceLabel = computed(() => {
  const p = f.money(props.service.basePriceMinor)
  return props.service.pricingType === 'quote' ? t('services.startsFrom', { price: p }) : p
})

function jump(anchor: string) {
  const el = document.getElementById(anchor)
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' })
}
</script>

<template>
  <div class="sections">
    <nav v-if="sections.length > 3" class="toc" :aria-label="t('services.tocLabel')">
      <a v-for="s in sections" :key="s.key" :href="`#${s.anchor}`" class="toc-link" @click.prevent="jump(s.anchor)">{{ s.title }}</a>
    </nav>

    <section v-for="s in sections" :id="s.anchor" :key="s.key" class="kh-card section">
      <h2 class="title">{{ s.title }}</h2>

      <p v-if="s.kind === 'text'" class="text">{{ s.text }}</p>

      <ul v-else-if="s.kind === 'list'" class="list">
        <li v-for="(it, i) in s.items" :key="i">
          <Check :size="18" :stroke-width="2" class="tick" aria-hidden="true" />{{ it }}
        </li>
      </ul>

      <ol v-else-if="s.kind === 'steps'" class="steps">
        <li v-for="(it, i) in s.items" :key="i">
          <span class="num">{{ f.number(i + 1) }}</span><span>{{ it }}</span>
        </li>
      </ol>

      <div v-else-if="s.kind === 'duration'" class="duration">
        <Clock :size="22" :stroke-width="1.8" class="clock" aria-hidden="true" />
        <div>
          <div class="strong">{{ f.text(service.deliveryEstimate) }}</div>
          <div class="small">{{ t('services.durationNote') }}</div>
        </div>
      </div>

      <div v-else-if="s.kind === 'pricing'" class="pricing">
        <div class="price-row"><span>{{ f.text(service.title) }}</span><strong>{{ priceLabel }}</strong></div>
        <div v-for="a in service.addons" :key="a.id" class="price-row">
          <span>{{ t('services.optionalAddon', { name: f.text(a.title) }) }}</span>
          <span>+ {{ f.money(a.priceMinor) }}</span>
        </div>
        <div class="small">{{ t('services.pricingNote') }}</div>
      </div>

      <SharedFaqAccordion v-else-if="s.kind === 'faq'" :items="s.faqs ?? []" size="md" />

      <template v-else-if="s.kind === 'reviews'">
        <div v-if="reviews.length" class="reviews">
          <div v-for="r in reviews" :key="r.id" class="review">
            <div class="review-head"><span class="strong">{{ r.displayName }}</span><span class="small">{{ f.date(r.createdAt) }}</span></div>
            <SharedStarRating :value="r.rating" />
            <p v-if="r.comment" class="review-text">{{ r.comment }}</p>
            <div v-if="r.reply" class="reply"><strong>{{ t('reviews.platformReply') }}</strong> {{ r.reply }}</div>
          </div>
        </div>
        <p v-else class="muted no-margin">{{ t('reviews.noneForService') }}</p>
      </template>
    </section>
  </div>
</template>

<style scoped>
.sections { display: flex; flex-direction: column; gap: 20px; }
.toc { display: flex; gap: 6px; flex-wrap: wrap; }
.toc-link { font-size: 13px; padding: 6px 12px; border-radius: 999px; background: var(--surface-nav); color: var(--text-body); }
.section { display: flex; flex-direction: column; gap: 14px; scroll-margin-top: 100px; }
.title { font-size: 22px; font-weight: 700; margin: 0; }
.text { margin: 0; font-size: 16px; line-height: 1.9; }
.list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.list li { display: flex; gap: 10px; align-items: flex-start; font-size: 15px; line-height: 1.7; }
.tick { color: var(--gold-500); flex-shrink: 0; margin-top: 4px; }
.steps { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; }
.steps li { display: flex; gap: 14px; align-items: flex-start; padding: 10px 0; border-bottom: 1px dashed var(--border-subtle); font-size: 15px; line-height: 1.8; }
.num {
  width: 28px; height: 28px; border-radius: 50%; background: var(--ink-900); color: var(--cream-100);
  display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0;
}
.duration { display: flex; gap: 12px; align-items: center; background: var(--gold-50); border-radius: 12px; padding: 16px; }
.clock { color: var(--gold-600); flex-shrink: 0; }
.strong { font-weight: 700; color: var(--text-strong); }
.small { font-size: 13px; color: var(--text-muted); }
.pricing { display: flex; flex-direction: column; gap: 8px; font-size: 15px; }
.price-row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-subtle); }
.price-row strong { color: var(--text-strong); }
.reviews { display: flex; flex-direction: column; }
.review { padding: 14px 0; border-bottom: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 6px; }
.review-head { display: flex; justify-content: space-between; gap: 8px; }
.review-text { margin: 0; font-size: 15px; line-height: 1.7; }
.reply { background: var(--neutral-100); border-radius: 10px; padding: 10px 14px; font-size: 14px; }
.reply strong { color: var(--text-strong); }
.no-margin { margin: 0; }
</style>
