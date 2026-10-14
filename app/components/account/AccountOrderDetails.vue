<script setup lang="ts">
import { describeAnswers } from '#shared/domain/formSchema'
import { localize } from '#shared/domain/localized'
import type { OrderDetail } from '~/repositories/orders'

/** Submitted answers (resolved against the exact form version) + own uploads. */
const props = defineProps<{ order: OrderDetail }>()

const { t, locale } = useI18n()
const f = useFormat()

const rows = computed(() => describeAnswers(props.order.formFields, props.order.formAnswers, locale.value, v => localize(v, locale.value), ymd => f.ymd(ymd)))
const uploads = computed(() => props.order.documents.filter(d => d.kind === 'customer_upload'))
const fieldLabel = (id: string | null) => f.text(props.order.formFields.find(x => x.id === id)?.label)
</script>

<template>
  <div class="details">
    <dl class="answers">
      <div v-for="r in rows" :key="r.fieldId" class="row">
        <dt>{{ r.label }}</dt>
        <dd class="prewrap">{{ r.value }}</dd>
      </div>
    </dl>
    <div>
      <div class="sub">{{ t('account.order.myFiles') }}</div>
      <p v-if="!uploads.length" class="muted small">{{ t('account.order.noFiles') }}</p>
      <div v-else class="files">
        <OrdersDocumentRow v-for="d in uploads" :id="d.id" :key="d.id" :name="d.originalName" :size="d.sizeBytes" :meta="fieldLabel(d.formFieldId)" />
      </div>
    </div>
    <p class="note">{{ t('account.order.snapshotNote') }}</p>
  </div>
</template>

<style scoped>
.details { display: flex; flex-direction: column; gap: 16px; }
.answers { margin: 0; display: flex; flex-direction: column; }
.row { display: grid; grid-template-columns: minmax(110px, 200px) 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-subtle); font-size: 14px; }
.row dt { color: var(--text-muted); }
.row dd { margin: 0; color: var(--text-strong); line-height: 1.7; }
.sub { font-size: 14px; font-weight: 700; color: var(--text-strong); margin-bottom: 8px; }
.small { font-size: 14px; margin: 0; }
.files { display: flex; flex-direction: column; gap: 8px; }
.note { margin: 0; font-size: 12px; color: var(--text-muted); }
@media (max-width: 520px) { .row { grid-template-columns: 1fr; gap: 2px; } }
</style>
