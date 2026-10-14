<script setup lang="ts">
import type { OrderDetail } from '~/repositories/orders'

/** Customer-uploaded files of the order (form uploads + message attachments). */
const props = defineProps<{ order: OrderDetail }>()
const { t } = useI18n()
const f = useFormat()

const files = computed(() => props.order.documents.filter(d => d.kind === 'customer_upload' || (d.kind === 'message_attachment' && !!d.messageId)))
const fieldLabel = (fieldId: string | null) => {
  const field = props.order.formFields.find(x => x.id === fieldId)
  return field ? f.text(field.label) : ''
}
</script>

<template>
  <section class="kh-card card">
    <h2 class="title">{{ t('dashOps.customerFiles') }}</h2>
    <span v-if="!files.length" class="muted">{{ t('dashOps.noFiles') }}</span>
    <OrdersDocumentRow
      v-for="d in files"
      :id="d.id"
      :key="d.id"
      :name="d.originalName"
      :size="d.sizeBytes"
      :meta="d.kind === 'customer_upload' ? fieldLabel(d.formFieldId) : t('dashOps.fromMessages')"
    />
  </section>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 8px; }
.title { font-size: 15px; font-weight: 700; margin: 0 0 4px; }
</style>
