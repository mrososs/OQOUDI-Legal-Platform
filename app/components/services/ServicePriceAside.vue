<script setup lang="ts">
import { Lock, Sparkles } from '@lucide/vue'
import { quoteSelection, resolveAddonPrice, resolveServicePrice } from '#shared/domain/pricing'
import type { ServiceDetail } from '~/repositories/catalog'

const props = defineProps<{ service: ServiceDetail }>()
const selectedAddons = defineModel<string[]>('addons', { default: () => [] })

const { t } = useI18n()
const f = useFormat()
const { active: launchActive, endsAt } = useLaunchCampaign()

const isQuote = computed(() => props.service.pricingType === 'quote')
const isMeeting = computed(() => props.service.kind === 'video_consultation')
const isWritten = computed(() => props.service.kind === 'written_consultation')

const base = computed(() => resolveServicePrice(props.service, launchActive.value))
const isLaunch = computed(() => base.value.isLaunch)

/** Add-ons that have a price in force right now (a company VIP add-on has none outside the launch window). */
const addons = computed(() => props.service.addons
  .map(a => ({ addon: a, price: resolveAddonPrice(a, props.service, launchActive.value) }))
  .filter(x => x.price.available))

// Preview only — the server recomputes the payable total when the order is created.
const quote = computed(() => quoteSelection(props.service, props.service.addons, selectedAddons.value, launchActive.value))
const regularQuote = computed(() => quoteSelection(props.service, props.service.addons, selectedAddons.value, false))
const showRegularTotal = computed(() => isLaunch.value && regularQuote.value.unavailable.length === 0)
const totalLabel = computed(() => (isQuote.value ? t('services.startsFrom', { price: f.money(quote.value.totalMinor) }) : f.money(quote.value.totalMinor)))

const delivery = computed(() => (isMeeting.value ? t('services.deliveryMeet') : isWritten.value ? t('services.deliveryWritten') : t('services.deliveryFiles')))
const cta = computed(() => {
  if (isLaunch.value) return t('launch.detail.cta')
  return isMeeting.value ? t('services.ctaMeeting') : isQuote.value ? t('services.ctaQuote') : isWritten.value ? t('services.ctaWritten') : t('services.ctaStart')
})
const note = computed(() => (isQuote.value ? t('services.noteQuote') : t('services.notePay')))

const requestTo = computed(() => ({
  path: `/service/${props.service.slug}/request`,
  query: selectedAddons.value.length ? { addons: selectedAddons.value.join(',') } : {},
}))

// A selected add-on whose price stops being in force (offer ended) is dropped.
watch(() => quote.value.unavailable, (gone) => {
  if (gone.length) selectedAddons.value = selectedAddons.value.filter(id => !gone.includes(id))
})

function toggle(id: string) {
  selectedAddons.value = selectedAddons.value.includes(id)
    ? selectedAddons.value.filter(x => x !== id)
    : [...selectedAddons.value, id]
}
</script>

<template>
  <aside class="aside">
    <div class="kh-card kh-card--raised card" :class="{ 'card--launch': isLaunch }">
      <section v-if="isLaunch" class="offer" :aria-label="t('launch.detail.title')">
        <div class="offer-head"><Sparkles :size="16" :stroke-width="2" aria-hidden="true" /> {{ t('launch.detail.title') }}</div>
        <p class="offer-text">{{ t('launch.detail.text', { pct: String(base.discountPercent ?? 0), days: String(15) }) }}</p>
        <ServicesLaunchCountdown tone="light" />
        <div v-if="endsAt" class="offer-ends">{{ t('launch.detail.endsOn', { date: f.dateTime(endsAt) }) }}</div>
      </section>

      <div>
        <div class="caption">{{ isQuote ? t('services.estimatedPrice') : t('services.servicePrice') }}</div>
        <ServicesServicePriceTag :service="service" size="lg" />
      </div>
      <dl class="facts">
        <div><dt>{{ t('services.duration') }}</dt><dd>{{ f.text(service.deliveryEstimate) }}</dd></div>
        <div><dt>{{ t('services.deliveryMethod') }}</dt><dd>{{ delivery }}</dd></div>
      </dl>
      <fieldset v-if="addons.length && !isQuote" class="addons">
        <legend class="addons-title">{{ isLaunch ? t('launch.detail.addonsTitle') : t('services.optionalAddons') }}</legend>
        <button
          v-for="{ addon, price } in addons"
          :key="addon.id"
          type="button"
          role="checkbox"
          class="addon"
          :aria-checked="selectedAddons.includes(addon.id)"
          @click="toggle(addon.id)"
        >
          <span class="addon-label">
            <span class="box" aria-hidden="true">{{ selectedAddons.includes(addon.id) ? '✓' : '' }}</span>{{ f.text(addon.title) }}
          </span>
          <span class="addon-price">
            <s v-if="price.isLaunch && price.regularMinor" class="was">{{ f.money(price.regularMinor) }}</s>
            + {{ f.money(price.currentMinor!) }}
          </span>
        </button>
      </fieldset>
      <div class="total">
        <span class="total-label">{{ t('services.total') }}</span>
        <span class="total-value">
          <s v-if="showRegularTotal && !isQuote" class="was">{{ f.money(regularQuote.totalMinor) }}</s>
          {{ totalLabel }}
        </span>
      </div>
      <UiButton size="lg" block :to="requestTo">{{ cta }}</UiButton>
      <div class="note">
        <Lock :size="16" :stroke-width="1.8" class="lock" aria-hidden="true" />
        <span>{{ note }}</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.aside { flex: 1 1 320px; max-width: 100%; position: sticky; top: 100px; }
.card { display: flex; flex-direction: column; gap: 16px; }
.card--launch { border-color: var(--gold-300); box-shadow: 0 0 0 1px var(--gold-200), var(--shadow-raised, 0 8px 24px rgba(28, 45, 74, 0.08)); }
.offer {
  display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; border-radius: 12px;
  background: linear-gradient(160deg, var(--gold-50), #fff 80%); border: 1px solid var(--gold-200);
}
.offer-head { display: flex; align-items: center; gap: 8px; font-family: var(--font-heading); font-weight: 800; font-size: 15px; color: var(--ink-900); }
.offer-head svg { color: var(--gold-500); }
.offer-text { margin: 0; font-size: 14px; line-height: 1.7; color: var(--text-body); }
.offer-ends { font-size: 12px; color: var(--text-muted); }
.caption { font-size: 13px; color: var(--text-muted); margin-bottom: 4px; }
.facts { margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 14px; }
.facts div { display: flex; justify-content: space-between; gap: 8px; }
.facts dt { color: var(--text-muted); }
.facts dd { margin: 0; font-weight: 700; color: var(--text-strong); }
.addons { border: none; margin: 0; padding: 14px 0 0; border-top: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 8px; }
.addons-title { font-size: 14px; font-weight: 600; color: var(--text-strong); padding: 0; margin-bottom: 8px; }
.addon {
  display: flex; gap: 10px; align-items: center; justify-content: space-between; border: 1.5px solid var(--border-default);
  background: #fff; border-radius: 10px; padding: 10px 12px; font-size: 14px; cursor: pointer; text-align: start; color: var(--text-body);
}
.addon[aria-checked='true'] { border-color: var(--ink-900); background: var(--gold-50); }
.addon-label { display: flex; gap: 10px; align-items: center; }
.box {
  width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid var(--ink-900); font-size: 12px; color: var(--cream-100);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.addon[aria-checked='true'] .box { background: var(--ink-900); }
.addon-price { color: var(--text-strong); font-weight: 600; white-space: nowrap; text-align: end; }
.was { color: var(--text-muted); font-weight: 400; font-size: 12px; margin-inline-end: 6px; text-decoration-color: var(--critical-500); }
.total { display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid var(--border-subtle); gap: 8px; }
.total-label { font-weight: 600; }
.total-value { font-size: 20px; font-weight: 700; color: var(--text-strong); text-align: end; }
.total-value .was { font-size: 14px; }
.note { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; color: var(--text-muted); line-height: 1.6; }
.lock { flex-shrink: 0; margin-top: 2px; }
</style>
