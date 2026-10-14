<script setup lang="ts">
import { Lock } from '@lucide/vue'
import { egpToMinor } from '#shared/domain/serviceAdmin'
import { nextKey, type AddonDraft, type ServiceDraft } from '~/composables/useServiceEditor'

/** Tab 2 — pricing type, base price, optional add-ons and customer preview. */
const draft = defineModel<ServiceDraft>({ required: true })
const props = defineProps<{ issues: Record<string, string> }>()

const { t } = useI18n()
const f = useFormat()

const isConsultation = computed(() => draft.value.kind !== 'standard')
const isQuote = computed(() => draft.value.pricingType === 'quote')
const priceMinor = computed(() => egpToMinor(draft.value.priceInput))
const priceError = computed(() => {
  if (priceMinor.value === null) return t('admin.issues.price')
  const code = props.issues.basePriceMinor
  return code ? t(`admin.issues.${code}`, t('admin.issues.invalid')) : ''
})

const activeAddons = computed(() => draft.value.addons.filter(a => a.isActive && a.title.ar.trim()))
const previewTotal = computed(() => priceMinor.value ?? 0)

function setType(type: ServiceDraft['pricingType']) {
  draft.value = { ...draft.value, pricingType: type }
}
function updateAddon(key: string, patch: Partial<AddonDraft>) {
  draft.value = { ...draft.value, addons: draft.value.addons.map(a => (a.key === key ? { ...a, ...patch } : a)) }
}
function addAddon() {
  draft.value = { ...draft.value, addons: [...draft.value.addons, { key: nextKey(), id: null, title: { ar: '', en: '' }, priceInput: '', isActive: true }] }
}
function removeAddon(a: AddonDraft) {
  // Saved add-ons are deactivated (kept for order history); new rows are dropped.
  if (a.id) updateAddon(a.key, { isActive: false })
  else draft.value = { ...draft.value, addons: draft.value.addons.filter(x => x.key !== a.key) }
}
</script>

<template>
  <div class="layout">
    <section class="kh-card col">
      <div class="kh-field">
        <span class="kh-field__label">{{ t('admin.pricing.type') }}</span>
        <div class="types" role="radiogroup" :aria-label="t('admin.pricing.type')">
          <button
            v-for="type in (['fixed', 'quote'] as const)"
            :key="type"
            type="button"
            role="radio"
            class="type"
            :aria-checked="draft.pricingType === type"
            :disabled="isConsultation && type === 'quote'"
            @click="setType(type)"
          >
            <strong>{{ t(`admin.pricing.${type}`) }}</strong>
            <span>{{ t(`admin.pricing.${type}Sub`) }}</span>
          </button>
        </div>
        <span v-if="isConsultation" class="kh-field__hint">{{ t('admin.pricing.consultationFixed') }}</span>
      </div>

      <div class="price">
        <UiInput
          :model-value="draft.priceInput"
          :label="isQuote ? t('admin.pricing.startsFromLabel') : t('admin.pricing.priceLabel')"
          inputmode="decimal"
          dir="ltr"
          required
          :error="draft.priceInput ? priceError : ''"
          @update:model-value="v => (draft = { ...draft, priceInput: String(v ?? '') })"
        />
      </div>

      <div v-if="!isQuote" class="addons">
        <span class="kh-field__label">{{ t('admin.pricing.addons') }}</span>
        <template v-for="a in draft.addons" :key="a.key">
          <div v-if="a.isActive" class="addon">
            <div class="addon-title">
              <AdminLocalizedInput
                :model-value="a.title"
                :label="t('admin.pricing.addonName')"
                compact
                @update:model-value="v => updateAddon(a.key, { title: v })"
              />
            </div>
            <div class="addon-price">
              <label class="sr-only" :for="`price-${a.key}`">{{ t('admin.pricing.addonPrice') }}</label>
              <input
                :id="`price-${a.key}`"
                class="kh-input"
                :class="{ 'kh-input--error': a.priceInput !== '' && egpToMinor(a.priceInput) === null }"
                inputmode="decimal"
                dir="ltr"
                :value="a.priceInput"
                :placeholder="t('admin.pricing.addonPrice')"
                @input="updateAddon(a.key, { priceInput: ($event.target as HTMLInputElement).value })"
              >
              <span class="muted">{{ t('admin.common.egp') }}</span>
              <button type="button" class="remove" :aria-label="t('admin.common.remove')" @click="removeAddon(a)">×</button>
            </div>
          </div>
        </template>
        <button type="button" class="link" @click="addAddon">{{ t('admin.pricing.addAddon') }}</button>
      </div>
      <p v-else class="muted small">{{ t('admin.pricing.quoteNoAddons') }}</p>

      <div class="note">{{ t('admin.pricing.snapshotNote') }}</div>
    </section>

    <aside class="kh-card kh-card--raised preview" :aria-label="t('admin.pricing.preview')">
      <div class="muted small">{{ t('admin.pricing.preview') }}</div>
      <div class="caption">{{ isQuote ? t('services.estimatedPrice') : t('services.servicePrice') }}</div>
      <div class="big">
        {{ priceMinor === null ? '—' : isQuote ? t('services.startsFrom', { price: f.money(previewTotal) }) : f.money(previewTotal) }}
      </div>
      <div v-for="a in activeAddons" :key="a.key" class="line">
        <span>{{ f.text(a.title) }}</span>
        <span>+ {{ egpToMinor(a.priceInput) === null ? '—' : f.money(egpToMinor(a.priceInput)!) }}</span>
      </div>
      <div class="secure"><Lock :size="14" aria-hidden="true" /> {{ isQuote ? t('services.noteQuote') : t('services.notePay') }}</div>
    </aside>
  </div>
</template>

<style scoped>
.layout { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
.col { flex: 1 1 460px; max-width: 760px; display: flex; flex-direction: column; gap: 16px; }
.types { display: flex; gap: 8px; flex-wrap: wrap; }
.type {
  flex: 1 1 200px; text-align: start; padding: 12px 14px; border-radius: 12px; border: 1.5px solid var(--border-default);
  background: #fff; cursor: pointer; display: flex; flex-direction: column; gap: 2px;
}
.type strong { color: var(--text-strong); }
.type span { font-size: 12px; color: var(--text-muted); }
.type[aria-checked='true'] { border-color: var(--ink-900); background: var(--gold-50); }
.type:disabled { opacity: .45; cursor: not-allowed; }
.price { max-width: 280px; }
.addons { display: flex; flex-direction: column; gap: 10px; }
.addon { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; border-bottom: 1px dashed var(--border-subtle); padding-bottom: 10px; }
.addon-title { flex: 1 1 320px; min-width: 0; }
.addon-price { display: flex; gap: 6px; align-items: center; }
.addon-price .kh-input { width: 120px; }
.remove { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-muted); }
.link { align-self: flex-start; background: none; border: none; padding: 0; color: var(--text-accent); cursor: pointer; font-weight: 600; }
.note { background: var(--neutral-100); border-radius: 10px; padding: 10px 14px; font-size: 13px; }
.small { font-size: 13px; margin: 0; }
.preview { flex: 0 1 320px; display: flex; flex-direction: column; gap: 10px; position: sticky; top: 120px; }
.caption { font-size: 13px; color: var(--text-muted); }
.big { font-family: var(--font-heading); font-size: 28px; font-weight: 800; color: var(--text-strong); }
.line { display: flex; justify-content: space-between; font-size: 14px; border-top: 1px solid var(--border-subtle); padding-top: 8px; }
.secure { display: flex; gap: 6px; align-items: flex-start; font-size: 12px; color: var(--text-muted); line-height: 1.6; }
</style>
