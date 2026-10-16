<script setup lang="ts">
import { Lock } from '@lucide/vue'
import { ADDON_KINDS, egpToMinor } from '#shared/domain/serviceAdmin'
import { nextKey, type AddonDraft, type ServiceDraft } from '~/composables/useServiceEditor'

/** Tab 2 — pricing type, regular + launch price, add-ons (VIP / bilingual) and customer preview. */
const draft = defineModel<ServiceDraft>({ required: true })
const props = defineProps<{ issues: Record<string, string> }>()

const { t } = useI18n()
const f = useFormat()

const isConsultation = computed(() => draft.value.kind !== 'standard')
const isQuote = computed(() => draft.value.pricingType === 'quote')
const canLaunch = computed(() => !isConsultation.value && !isQuote.value)
const priceMinor = computed(() => egpToMinor(draft.value.priceInput))
const launchMinor = computed(() => (draft.value.launchInput.trim() === '' ? null : egpToMinor(draft.value.launchInput)))
const priceError = computed(() => {
  if (priceMinor.value === null) return t('admin.issues.price')
  const code = props.issues.basePriceMinor
  return code ? t(`admin.issues.${code}`, t('admin.issues.invalid')) : ''
})
const launchError = computed(() => {
  if (draft.value.launchInput.trim() !== '' && launchMinor.value === null) return t('admin.issues.price')
  if (launchMinor.value !== null && priceMinor.value !== null && launchMinor.value > priceMinor.value) return t('admin.issues.launch_above_base')
  const code = props.issues.launchPriceMinor
  return code ? t(`admin.issues.${code}`, t('admin.issues.invalid')) : ''
})
const discountPct = computed(() =>
  launchMinor.value !== null && priceMinor.value ? Math.round((100 * (priceMinor.value - launchMinor.value)) / priceMinor.value) : null,
)

const activeAddons = computed(() => draft.value.addons.filter(a => a.isActive && a.title.ar.trim()))
const kindOptions = computed(() => [
  { value: '', label: t('admin.pricing.kinds.none') },
  ...ADDON_KINDS.map(k => ({ value: k, label: t(`admin.pricing.kinds.${k}`) })),
])

function setType(type: ServiceDraft['pricingType']) {
  draft.value = { ...draft.value, pricingType: type }
}
function updateAddon(key: string, patch: Partial<AddonDraft>) {
  draft.value = { ...draft.value, addons: draft.value.addons.map(a => (a.key === key ? { ...a, ...patch } : a)) }
}
function addAddon() {
  draft.value = { ...draft.value, addons: [...draft.value.addons, { key: nextKey(), id: null, kind: null, title: { ar: '', en: '' }, priceInput: '', launchInput: '', isActive: true }] }
}
function removeAddon(a: AddonDraft) {
  // Saved add-ons are deactivated (kept for order history); new rows are dropped.
  if (a.id) updateAddon(a.key, { isActive: false })
  else draft.value = { ...draft.value, addons: draft.value.addons.filter(x => x.key !== a.key) }
}
function addonError(a: AddonDraft, which: 'regular' | 'launch') {
  const v = which === 'regular' ? a.priceInput : a.launchInput
  if (v.trim() !== '' && egpToMinor(v) === null) return true
  if (which === 'regular' && v.trim() === '' && a.launchInput.trim() === '') return true
  return false
}

/** What a customer pays with every add-on selected, regular vs launch. */
const regularTotal = computed(() => (priceMinor.value ?? 0) + activeAddons.value.reduce((n, a) => n + (egpToMinor(a.priceInput) ?? 0), 0))
const launchTotal = computed(() => (launchMinor.value ?? priceMinor.value ?? 0)
  + activeAddons.value.reduce((n, a) => n + (a.launchInput.trim() !== '' ? (egpToMinor(a.launchInput) ?? 0) : (egpToMinor(a.priceInput) ?? 0)), 0))
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

      <div class="launch">
        <div class="launch-head">
          <span class="kh-field__label">{{ t('admin.pricing.launch.title') }}</span>
          <AdminSwitch
            :model-value="canLaunch && draft.launchEligible"
            :disabled="!canLaunch"
            :label="t('admin.pricing.launch.eligible')"
            @update:model-value="v => (draft = { ...draft, launchEligible: v })"
          />
        </div>
        <p v-if="!canLaunch" class="muted small">{{ t('admin.pricing.launch.notAvailable') }}</p>
        <template v-else>
          <div class="price">
            <UiInput
              :model-value="draft.launchInput"
              :label="t('admin.pricing.launch.price')"
              inputmode="decimal"
              dir="ltr"
              :hint="t('admin.pricing.launch.priceHint')"
              :error="launchError"
              @update:model-value="v => (draft = { ...draft, launchInput: String(v ?? '') })"
            />
          </div>
          <p v-if="discountPct !== null && !launchError" class="muted small">{{ t('admin.pricing.launch.discountNote', { pct: f.number(discountPct) }) }}</p>
          <p v-if="draft.launchEligible && draft.launchInput.trim() === ''" class="warn small">{{ t('admin.issues.launch_needs_price') }}</p>
        </template>
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
            <div class="addon-kind">
              <UiSelect
                :model-value="a.kind ?? ''"
                :label="t('admin.pricing.kinds.label')"
                :options="kindOptions"
                @update:model-value="v => updateAddon(a.key, { kind: (v || null) as AddonDraft['kind'] })"
              />
            </div>
            <div class="addon-price">
              <label class="sr-only" :for="`price-${a.key}`">{{ t('admin.pricing.addonRegular') }}</label>
              <input
                :id="`price-${a.key}`"
                class="kh-input"
                :class="{ 'kh-input--error': addonError(a, 'regular') }"
                inputmode="decimal"
                dir="ltr"
                :value="a.priceInput"
                :placeholder="t('admin.pricing.addonRegular')"
                @input="updateAddon(a.key, { priceInput: ($event.target as HTMLInputElement).value })"
              >
              <label class="sr-only" :for="`launch-${a.key}`">{{ t('admin.pricing.addonLaunch') }}</label>
              <input
                :id="`launch-${a.key}`"
                class="kh-input"
                :class="{ 'kh-input--error': addonError(a, 'launch') }"
                inputmode="decimal"
                dir="ltr"
                :value="a.launchInput"
                :placeholder="t('admin.pricing.addonLaunch')"
                @input="updateAddon(a.key, { launchInput: ($event.target as HTMLInputElement).value })"
              >
              <span class="muted">{{ t('admin.common.egp') }}</span>
              <button type="button" class="remove" :aria-label="t('admin.common.remove')" @click="removeAddon(a)">×</button>
            </div>
            <p v-if="a.priceInput.trim() === ''" class="muted small full">{{ t('admin.pricing.addonNoRegular') }}</p>
          </div>
        </template>
        <button type="button" class="link" @click="addAddon">{{ t('admin.pricing.addAddon') }}</button>
      </div>
      <p v-else class="muted small">{{ t('admin.pricing.quoteNoAddons') }}</p>

      <div class="note">{{ t('admin.pricing.snapshotNote') }}</div>
    </section>

    <aside class="kh-card kh-card--raised preview" :aria-label="t('admin.pricing.preview')">
      <div class="muted small">{{ t('admin.pricing.preview') }}</div>
      <div class="caption">{{ isQuote ? t('services.estimatedPrice') : t('admin.pricing.regularLabel') }}</div>
      <div class="big">
        {{ priceMinor === null ? '—' : isQuote ? t('services.startsFrom', { price: f.money(priceMinor) }) : f.money(priceMinor) }}
      </div>
      <template v-if="canLaunch && draft.launchEligible && launchMinor !== null">
        <div class="caption">{{ t('admin.pricing.launch.previewLabel') }}</div>
        <div class="big big--launch">{{ f.money(launchMinor) }}</div>
      </template>
      <div v-for="a in activeAddons" :key="a.key" class="line">
        <span>{{ f.text(a.title) }}</span>
        <span>
          <template v-if="a.priceInput.trim() !== ''">+ {{ egpToMinor(a.priceInput) === null ? '—' : f.money(egpToMinor(a.priceInput)!) }}</template>
          <template v-else>{{ t('admin.pricing.addonLaunchOnly') }}</template>
          <span v-if="canLaunch && draft.launchEligible && a.launchInput.trim() !== ''" class="launch-amount"> · {{ f.money(egpToMinor(a.launchInput) ?? 0) }}</span>
        </span>
      </div>
      <div v-if="canLaunch && draft.launchEligible && launchMinor !== null && activeAddons.length" class="line line--total">
        <span>{{ t('admin.pricing.launch.allSelected') }}</span>
        <span><s class="muted">{{ f.money(regularTotal) }}</s> {{ f.money(launchTotal) }}</span>
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
.launch { display: flex; flex-direction: column; gap: 10px; padding: 14px; border: 1px solid var(--gold-200); border-radius: 12px; background: var(--gold-50); }
.launch-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.addons { display: flex; flex-direction: column; gap: 10px; }
.addon { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; border-bottom: 1px dashed var(--border-subtle); padding-bottom: 10px; }
.addon-title { flex: 1 1 280px; min-width: 0; }
.addon-kind { flex: 0 1 190px; }
.addon-price { display: flex; gap: 6px; align-items: center; }
.addon-price .kh-input { width: 104px; }
.full { flex: 1 1 100%; margin: 0; }
.remove { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-muted); }
.link { align-self: flex-start; background: none; border: none; padding: 0; color: var(--text-accent); cursor: pointer; font-weight: 600; }
.note { background: var(--neutral-100); border-radius: 10px; padding: 10px 14px; font-size: 13px; }
.small { font-size: 13px; margin: 0; }
.warn { color: var(--caution-500); }
.preview { flex: 0 1 320px; display: flex; flex-direction: column; gap: 10px; position: sticky; top: 120px; }
.caption { font-size: 13px; color: var(--text-muted); }
.big { font-family: var(--font-heading); font-size: 28px; font-weight: 800; color: var(--text-strong); }
.big--launch { color: var(--gold-700); }
.line { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; border-top: 1px solid var(--border-subtle); padding-top: 8px; }
.line--total { font-weight: 700; }
.launch-amount { color: var(--gold-700); font-weight: 700; }
.secure { display: flex; gap: 6px; align-items: flex-start; font-size: 12px; color: var(--text-muted); line-height: 1.6; }
</style>
