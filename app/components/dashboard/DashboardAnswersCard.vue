<script setup lang="ts">
import { describeAnswers } from '#shared/domain/formSchema'
import { localize } from '#shared/domain/localized'
import type { OrderDetail } from '~/repositories/orders'

/** Form answers rendered with labels of the exact form version the customer used. */
const props = defineProps<{
  order: OrderDetail
  formVersion: number | null
}>()

const { t, locale } = useI18n()
const f = useFormat()

const rows = computed(() => describeAnswers(props.order.formFields, props.order.formAnswers, locale.value, v => localize(v, locale.value), ymd => f.ymd(ymd)))
const addonsLabel = computed(() => props.order.addons.map(a => f.text(a.title)).join(locale.value === 'en' ? ', ' : '، '))
</script>

<template>
  <section class="kh-card card">
    <h2 class="title">{{ t('dashOps.answers') }}</h2>
    <div class="muted small">
      {{ t('dashOps.formVersionLine', { v: f.number(formVersion ?? 0), price: f.money(order.totalMinor) }) }}
    </div>
    <div v-if="order.addons.length" class="row">
      <div class="k">{{ t('services.optionalAddons') }}</div>
      <div class="v">{{ addonsLabel }}</div>
    </div>
    <div v-for="r in rows" :key="r.fieldId" class="row">
      <div class="k">{{ r.label }}</div>
      <div class="v prewrap">{{ r.value }}</div>
    </div>
    <p v-if="!rows.length" class="muted no-margin">{{ t('common.none') }}</p>
  </section>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 4px; }
.title { font-size: 15px; font-weight: 700; margin: 0 0 4px; }
.small { font-size: 12px; margin-bottom: 6px; }
.row { padding: 8px 0; border-bottom: 1px solid var(--border-subtle); }
.k { font-size: 12px; color: var(--text-muted); }
.v { color: var(--text-strong); line-height: 1.7; }
.no-margin { margin: 0; }
</style>
