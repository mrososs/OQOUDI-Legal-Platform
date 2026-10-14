<script setup lang="ts">
import type { OrderDetail } from '~/repositories/orders'

/** Delivered versions (newest first). Earlier versions stay available. */
const props = defineProps<{ order: OrderDetail }>()

const { t } = useI18n()
const f = useFormat()

const versions = computed(() => props.order.deliveries.map((d, i) => ({
  ...d,
  latest: i === 0,
  files: props.order.documents.filter(doc => doc.kind === 'deliverable' && doc.deliveryId === d.id),
})))
const emptyText = computed(() => {
  const kind = props.order.service.kind
  return t(`account.order.noDocs.${kind === 'video_consultation' ? 'meeting' : kind === 'written_consultation' ? 'written' : 'standard'}`)
})
</script>

<template>
  <div class="deliveries">
    <template v-if="versions.length">
      <div v-for="v in versions" :key="v.id" class="version">
        <div class="head">
          <div class="label">
            <strong>{{ t('account.order.version', { v: f.number(v.version) }) }}</strong>
            <UiBadge v-if="v.latest" tone="solid">{{ t('account.order.latest') }}</UiBadge>
          </div>
          <span class="at">{{ t('account.order.deliveredAt', { date: f.dateTime(v.deliveredAt) }) }}</span>
        </div>
        <div v-if="v.note" class="note prewrap">{{ t('account.order.lawyerNote', { note: v.note }) }}</div>
        <OrdersDocumentRow
          v-for="d in v.files"
          :id="d.id"
          :key="d.id"
          :name="d.originalName"
          :size="d.sizeBytes"
          :badge="`v${v.version}`"
        />
      </div>
    </template>
    <div v-else class="empty">
      <strong>{{ t('account.order.noDocsTitle') }}</strong>
      <span>{{ emptyText }}</span>
    </div>
  </div>
</template>

<style scoped>
.deliveries { display: flex; flex-direction: column; gap: 12px; }
.version { border: 1px solid var(--border-subtle); border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.label { display: flex; gap: 8px; align-items: center; }
.label strong { color: var(--text-strong); }
.at { font-size: 12px; color: var(--text-muted); }
.note { font-size: 14px; background: var(--neutral-100); border-radius: 10px; padding: 10px 12px; }
.empty { text-align: center; padding: 32px 16px; color: var(--text-muted); display: flex; flex-direction: column; gap: 6px; align-items: center; font-size: 14px; }
.empty strong { color: var(--text-strong); font-size: 16px; }
</style>
