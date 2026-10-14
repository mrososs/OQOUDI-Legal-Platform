<script setup lang="ts">
import { Lock } from '@lucide/vue'
import type { ServiceDetail } from '~/repositories/catalog'

const props = defineProps<{ service: ServiceDetail }>()
const selectedAddons = defineModel<string[]>('addons', { default: () => [] })

const { t } = useI18n()
const f = useFormat()

const isQuote = computed(() => props.service.pricingType === 'quote')
const isMeeting = computed(() => props.service.kind === 'video_consultation')
const isWritten = computed(() => props.service.kind === 'written_consultation')

/** Preview only — the server recomputes the payable total. */
const totalMinor = computed(() =>
  props.service.basePriceMinor
  + props.service.addons.filter(a => selectedAddons.value.includes(a.id)).reduce((n, a) => n + a.priceMinor, 0),
)
const totalLabel = computed(() => (isQuote.value ? t('services.startsFrom', { price: f.money(totalMinor.value) }) : f.money(totalMinor.value)))
const priceLabel = computed(() => (isQuote.value ? t('services.startsFrom', { price: f.money(props.service.basePriceMinor) }) : f.money(props.service.basePriceMinor)))

const delivery = computed(() => (isMeeting.value ? t('services.deliveryMeet') : isWritten.value ? t('services.deliveryWritten') : t('services.deliveryFiles')))
const cta = computed(() => (isMeeting.value ? t('services.ctaMeeting') : isQuote.value ? t('services.ctaQuote') : isWritten.value ? t('services.ctaWritten') : t('services.ctaStart')))
const note = computed(() => (isQuote.value ? t('services.noteQuote') : t('services.notePay')))

const requestTo = computed(() => ({
  path: `/service/${props.service.slug}/request`,
  query: selectedAddons.value.length ? { addons: selectedAddons.value.join(',') } : {},
}))

function toggle(id: string) {
  selectedAddons.value = selectedAddons.value.includes(id)
    ? selectedAddons.value.filter(x => x !== id)
    : [...selectedAddons.value, id]
}
</script>

<template>
  <aside class="aside">
    <div class="kh-card kh-card--raised card">
      <div>
        <div class="caption">{{ isQuote ? t('services.estimatedPrice') : t('services.servicePrice') }}</div>
        <div class="price">{{ priceLabel }}</div>
      </div>
      <dl class="facts">
        <div><dt>{{ t('services.duration') }}</dt><dd>{{ f.text(service.deliveryEstimate) }}</dd></div>
        <div><dt>{{ t('services.deliveryMethod') }}</dt><dd>{{ delivery }}</dd></div>
      </dl>
      <fieldset v-if="service.addons.length && !isQuote" class="addons">
        <legend class="addons-title">{{ t('services.optionalAddons') }}</legend>
        <button
          v-for="a in service.addons"
          :key="a.id"
          type="button"
          role="checkbox"
          class="addon"
          :aria-checked="selectedAddons.includes(a.id)"
          @click="toggle(a.id)"
        >
          <span class="addon-label">
            <span class="box" aria-hidden="true">{{ selectedAddons.includes(a.id) ? '✓' : '' }}</span>{{ f.text(a.title) }}
          </span>
          <span class="addon-price">+ {{ f.money(a.priceMinor) }}</span>
        </button>
      </fieldset>
      <div class="total">
        <span class="total-label">{{ t('services.total') }}</span>
        <span class="total-value">{{ totalLabel }}</span>
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
.caption { font-size: 13px; color: var(--text-muted); }
.price { font-family: var(--font-heading); font-size: 32px; font-weight: 800; color: var(--text-strong); }
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
.addon-price { color: var(--text-strong); font-weight: 600; white-space: nowrap; }
.total { display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid var(--border-subtle); }
.total-label { font-weight: 600; }
.total-value { font-size: 20px; font-weight: 700; color: var(--text-strong); }
.note { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; color: var(--text-muted); line-height: 1.6; }
.lock { flex-shrink: 0; margin-top: 2px; }
</style>
