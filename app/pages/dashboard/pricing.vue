<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { egpToMinor, minorToEgpInput } from '#shared/domain/serviceAdmin'
import { fetchAdminServices } from '~/repositories/admin'

definePageMeta({ layout: 'lawyer', middleware: ['auth', 'admin'] })

const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const { call, toFailure } = useApi()
const toast = useToast()

const { data: services, refresh } = await useAsyncData('admin:services', () => fetchAdminServices(supabase), { default: () => [] })

interface Row { pricingType: 'fixed' | 'quote', price: string }
const edits = ref<Record<string, Row>>({})

watch(services, (list) => {
  edits.value = Object.fromEntries(list.map(s => [s.id, { pricingType: s.pricingType, price: minorToEgpInput(s.basePriceMinor) }]))
}, { immediate: true })

const changes = computed(() =>
  services.value
    .filter((s) => {
      const e = edits.value[s.id]
      return e && (e.pricingType !== s.pricingType || egpToMinor(e.price) !== s.basePriceMinor)
    })
    .map(s => ({ serviceId: s.id, pricingType: edits.value[s.id]!.pricingType, basePriceMinor: egpToMinor(edits.value[s.id]!.price) })),
)
const invalid = computed(() => changes.value.some(c => c.basePriceMinor === null || (c.pricingType === 'quote' && c.basePriceMinor <= 0)))
const busy = shallowRef(false)
const error = shallowRef('')

function setRow(id: string, patch: Partial<Row>) {
  edits.value = { ...edits.value, [id]: { ...edits.value[id]!, ...patch } }
}

async function save() {
  if (!changes.value.length || invalid.value) return
  busy.value = true
  error.value = ''
  try {
    await call('/api/admin/prices', { method: 'POST', body: { prices: changes.value } })
    await refresh()
    toast.success(t('admin.pricingPage.saved'))
  }
  catch (err) {
    error.value = toFailure(err).message
  }
  finally {
    busy.value = false
  }
}

useSeoMeta({ title: () => t('dash.nav.pricing'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <div class="head">
      <h1 class="title">{{ t('dash.nav.pricing') }}</h1>
      <UiButton size="sm" :loading="busy" :disabled="!changes.length || invalid" @click="save">
        {{ t('admin.pricingPage.save') }}{{ changes.length ? ` (${f.number(changes.length)})` : '' }}
      </UiButton>
    </div>
    <div class="note">{{ t('admin.pricingPage.note') }}</div>
    <UiAlert v-if="error">{{ error }}</UiAlert>
    <div class="kh-card table-card">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.services.cols.service') }}</th>
            <th>{{ t('admin.pricingPage.type') }}</th>
            <th>{{ t('admin.pricingPage.price') }}</th>
            <th>{{ t('admin.pricingPage.addons') }}</th>
            <th><span class="sr-only">{{ t('admin.services.cols.actions') }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in services" :key="s.id" :class="{ changed: changes.some(c => c.serviceId === s.id) }">
            <td>
              <strong class="strong">{{ f.text(s.title) }}</strong>
              <div v-if="s.kind !== 'standard'" class="sub">{{ t('admin.pricingPage.consultationFee') }}</div>
            </td>
            <td>
              <div class="types" role="radiogroup" :aria-label="t('admin.pricingPage.type')">
                <button
                  v-for="type in (['fixed', 'quote'] as const)"
                  :key="type"
                  type="button"
                  role="radio"
                  class="pill"
                  :aria-checked="edits[s.id]?.pricingType === type"
                  :disabled="s.kind !== 'standard' && type === 'quote'"
                  @click="setRow(s.id, { pricingType: type })"
                >
                  {{ t(`admin.pricing.${type}`) }}
                </button>
              </div>
            </td>
            <td>
              <label class="sr-only" :for="`p-${s.id}`">{{ t('admin.pricingPage.price') }}</label>
              <input
                :id="`p-${s.id}`"
                class="kh-input price"
                :class="{ 'kh-input--error': egpToMinor(edits[s.id]?.price) === null }"
                inputmode="decimal"
                dir="ltr"
                :value="edits[s.id]?.price"
                @input="setRow(s.id, { price: ($event.target as HTMLInputElement).value })"
              >
            </td>
            <td class="muted">{{ s.activeAddons ? t('admin.pricingPage.addonsCount', { n: f.number(s.activeAddons) }) : '—' }}</td>
            <td class="end">
              <NuxtLinkLocale :to="{ path: `/dashboard/services/${s.id}`, query: { tab: 'pricing' } }">{{ t('admin.pricingPage.details') }}</NuxtLinkLocale>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.title { font-size: 26px; font-weight: 800; margin: 0; }
.note { background: var(--neutral-100); border-radius: 10px; padding: 10px 14px; font-size: 13px; }
.table-card { padding: 0; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 760px; font-size: 14px; }
.table th { background: var(--neutral-100); text-align: start; color: var(--text-muted); font-weight: 600; padding: 10px 16px; }
.table td { padding: 10px 16px; border-top: 1px solid var(--border-subtle); }
tr.changed { background: var(--gold-50); }
.strong { color: var(--text-strong); }
.sub { font-size: 11px; color: var(--text-muted); }
.types { display: flex; gap: 4px; }
.pill {
  padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border-default); background: #fff;
  color: var(--text-body); font-size: 12px; cursor: pointer;
}
.pill[aria-checked='true'] { background: var(--ink-900); color: var(--cream-100); border-color: var(--ink-900); }
.pill:disabled { opacity: .4; cursor: not-allowed; }
.price { width: 130px; padding: 8px 10px; }
.end { text-align: end; }
</style>
