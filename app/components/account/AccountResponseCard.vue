<script setup lang="ts">
import { Lock } from '@lucide/vue'
import type { OrderDetail } from '~/repositories/orders'

/** Written consultation answer (latest version) with its attachments. */
const props = defineProps<{ order: OrderDetail, lawyerName?: string | null }>()

const { t } = useI18n()
const f = useFormat()

const latest = computed(() => props.order.responses[0] ?? null)
const files = computed(() => props.order.documents.filter(d => d.kind === 'consultation_response' && d.responseId === latest.value?.id))
const paragraphs = computed(() => (latest.value?.body ?? '').split(/\n+/).map(p => p.trim()).filter(Boolean))
</script>

<template>
  <section v-if="latest" class="kh-card card">
    <div class="head">
      <h2 class="title">{{ t('account.response.title') }}</h2>
      <span class="private"><Lock :size="14" :stroke-width="2" aria-hidden="true" />{{ t('account.response.visibility', { date: f.dateTime(latest.publishedAt) }) }}</span>
    </div>
    <div v-if="lawyerName" class="by">{{ t('account.response.by', { name: lawyerName }) }}</div>
    <div class="body">
      <p v-for="(p, i) in paragraphs" :key="i" class="para">{{ p }}</p>
    </div>
    <div v-if="files.length" class="files">
      <OrdersDocumentRow v-for="d in files" :id="d.id" :key="d.id" :name="d.originalName" :size="d.sizeBytes" />
    </div>
  </section>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 14px; border-color: var(--gold-300); }
.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.title { font-size: 18px; font-weight: 700; margin: 0; }
.private { font-size: 12px; color: var(--text-muted); display: inline-flex; gap: 6px; align-items: center; }
.by { font-size: 13px; color: var(--text-muted); }
.body { display: flex; flex-direction: column; gap: 12px; }
.para { margin: 0; font-size: 16px; line-height: 1.95; color: var(--text-strong); overflow-wrap: anywhere; }
.files { display: flex; flex-direction: column; gap: 8px; }
</style>
