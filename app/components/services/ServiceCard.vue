<script setup lang="ts">
import type { ServiceSummary } from '~/repositories/catalog'

const props = withDefaults(defineProps<{
  service: ServiceSummary
  categoryLabel: string
  variant?: 'featured' | 'directory'
}>(), { variant: 'directory' })

const { t } = useI18n()
const f = useFormat()

const to = computed(() => `/service/${props.service.slug}`)
const priceLabel = computed(() => {
  const price = f.money(props.service.basePriceMinor)
  return props.service.pricingType === 'quote' ? t('services.startsFrom', { price }) : price
})
const ratingLabel = computed(() =>
  props.service.rating
    ? `${f.number(props.service.rating.avg)} (${f.number(props.service.rating.count)})`
    : t('services.newService'),
)
</script>

<template>
  <article class="kh-card card" :class="{ 'kh-card--interactive': variant === 'directory' }">
    <div class="top">
      <UiBadge tone="neutral">{{ categoryLabel }}</UiBadge>
      <span class="rating"><span class="star" aria-hidden="true">★</span> {{ ratingLabel }}</span>
    </div>
    <h3 class="title">
      <NuxtLinkLocale :to="to" class="title-link">{{ f.text(service.title) }}</NuxtLinkLocale>
    </h3>
    <p class="short">{{ f.text(service.shortDescription) }}</p>
    <div class="bottom">
      <div>
        <div class="price">{{ priceLabel }}</div>
        <div class="days">{{ f.text(service.deliveryEstimate) }}</div>
      </div>
      <UiButton v-if="variant === 'featured'" variant="ghost" size="sm" :to="to" :aria-label="`${t('services.details')} — ${f.text(service.title)}`">
        {{ t('services.detailsArrow') }}
      </UiButton>
      <span v-else class="cta" aria-hidden="true">{{ t('services.viewServiceArrow') }}</span>
    </div>
  </article>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 12px; padding: 24px; position: relative; }
.top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.rating { font-size: 13px; color: var(--text-muted); }
.star { color: var(--gold-400); }
.title { font-family: var(--font-heading); font-size: 20px; font-weight: 700; margin: 0; }
.title-link { color: var(--text-strong); }
/* Directory cards: the whole card is the link target */
.kh-card--interactive .title-link::after { content: ''; position: absolute; inset: 0; border-radius: inherit; }
.short { margin: 0; font-size: 14px; line-height: 1.7; color: var(--text-body); flex: 1; }
.bottom {
  display: flex; justify-content: space-between; align-items: flex-end; gap: 8px;
  padding-top: 12px; border-top: 1px solid var(--border-subtle);
}
.price { font-size: 18px; font-weight: 700; color: var(--text-strong); }
.days { font-size: 12px; color: var(--text-muted); }
.cta { font-size: 14px; font-weight: 600; color: var(--text-accent); }
</style>
