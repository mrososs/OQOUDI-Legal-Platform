<script setup lang="ts">
import { DELIVERABLE_EXTENSIONS } from '#shared/domain/uploads'
import type { OrderDetail } from '~/repositories/orders'
import type { UploadedFile } from '~/composables/useUpload'

/** Versioned deliverables: history (never overwritten) + upload of the next version. */
const props = defineProps<{
  order: OrderDetail
  busy: string | null
}>()

const emit = defineEmits<{ deliver: [payload: { documentIds: string[], note: string }] }>()

const { t } = useI18n()
const f = useFormat()

const files = ref<UploadedFile[]>([])
const note = shallowRef('')

const nextVersion = computed(() => (props.order.deliveries[0]?.version ?? 0) + 1)
const canDeliver = computed(() => ['under_review', 'in_progress', 'revision'].includes(props.order.status))
const versions = computed(() => props.order.deliveries.map(d => ({
  ...d,
  docs: props.order.documents.filter(doc => doc.deliveryId === d.id),
})))

watch(() => props.order.deliveries.length, () => {
  files.value = []
  note.value = ''
})

function submit() {
  if (!files.value.length) return
  emit('deliver', { documentIds: files.value.map(x => x.id), note: note.value.trim() })
}
</script>

<template>
  <section class="kh-card panel">
    <div class="head">
      <h2 class="title">{{ t('dashOps.deliverables') }}</h2>
      <span class="muted small">{{ t('dashOps.versionsCount', { n: f.number(order.deliveries.length) }) }}</span>
    </div>

    <p v-if="!versions.length" class="muted no-margin">{{ t('dashOps.noDeliveries') }}</p>
    <div v-for="v in versions" :key="v.id" class="version">
      <div class="version-head">
        <strong>{{ t('dashOps.versionN', { n: f.number(v.version) }) }}</strong>
        <span class="muted small">{{ f.dateTime(v.deliveredAt) }}</span>
      </div>
      <p v-if="v.note" class="note prewrap">{{ v.note }}</p>
      <OrdersDocumentRow
        v-for="d in v.docs"
        :id="d.id"
        :key="d.id"
        :name="d.originalName"
        :size="d.sizeBytes"
        :badge="`v${v.version}`"
      />
    </div>

    <div v-if="canDeliver" class="upload">
      <FormsFileDropzone
        v-model="files"
        :label="t('dashOps.uploadVersion', { n: f.number(nextVersion) })"
        :target="{ purpose: 'deliverable', orderId: order.id }"
        :accept="DELIVERABLE_EXTENSIONS"
        :max-size-mb="20"
        :max-files="5"
        :hint="t('dashOps.uploadHint')"
      />
      <UiTextarea v-model="note" :label="t('dashOps.noteForCustomer')" :rows="2" :maxlength="2000" />
      <div>
        <UiButton :disabled="!files.length" :loading="busy === 'deliver'" @click="submit">
          {{ t('dashOps.deliverVersion', { n: f.number(nextVersion) }) }}
        </UiButton>
      </div>
    </div>
    <p v-else-if="order.status === 'delivered'" class="muted small no-margin">{{ t('dashOps.awaitingDecision') }}</p>
  </section>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 12px; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.title { font-size: 17px; font-weight: 700; margin: 0; }
.small { font-size: 12px; }
.no-margin { margin: 0; }
.version { display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--border-subtle); border-radius: 12px; padding: 12px; }
.version-head { display: flex; justify-content: space-between; gap: 8px; color: var(--text-strong); }
.note { margin: 0; font-size: 13px; color: var(--text-body); }
.upload { display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--border-subtle); padding-top: 12px; }
</style>
