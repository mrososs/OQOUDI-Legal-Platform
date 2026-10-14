<script setup lang="ts">
import { DELIVERABLE_EXTENSIONS } from '#shared/domain/uploads'
import type { OrderDetail } from '~/repositories/orders'
import type { UploadedFile } from '~/composables/useUpload'

/** Written consultation answer editor + published answers. */
const props = defineProps<{
  order: OrderDetail
  busy: string | null
}>()

const emit = defineEmits<{ publish: [payload: { body: string, documentIds: string[] }] }>()

const { t } = useI18n()
const f = useFormat()

const body = shallowRef('')
const files = ref<UploadedFile[]>([])
const error = shallowRef('')
const canPublish = computed(() => ['under_review', 'in_progress', 'revision'].includes(props.order.status))

watch(() => props.order.responses.length, () => {
  body.value = ''
  files.value = []
})

function submit() {
  if (body.value.trim().length < 20) {
    error.value = t('formErrors.minLength', { min: f.number(20) })
    return
  }
  error.value = ''
  emit('publish', { body: body.value.trim(), documentIds: files.value.map(x => x.id) })
}
</script>

<template>
  <section class="kh-card panel">
    <h2 class="title">{{ t('dashOps.writtenReply') }}</h2>

    <div v-for="r in order.responses" :key="r.id" class="published">
      <div class="published-head">
        <UiBadge tone="positive" dot>{{ t('dashOps.responseSent', { when: f.dateTime(r.publishedAt) }) }}</UiBadge>
        <span class="muted small">{{ t('dashOps.versionN', { n: f.number(r.version) }) }}</span>
      </div>
      <p class="body prewrap">{{ r.body }}</p>
      <OrdersDocumentRow
        v-for="d in order.documents.filter(x => x.responseId === r.id)"
        :id="d.id"
        :key="d.id"
        :name="d.originalName"
        :size="d.sizeBytes"
      />
    </div>

    <template v-if="canPublish">
      <UiTextarea
        v-model="body"
        :label="t('dashOps.replyLabel')"
        :placeholder="t('dashOps.replyPlaceholder')"
        :rows="10"
        :maxlength="20000"
        :error="error"
        :hint="t('dashOps.replyLength', { n: f.number(body.trim().length) })"
      />
      <FormsFileDropzone
        v-model="files"
        :label="t('dashOps.attachDocument')"
        :target="{ purpose: 'response', orderId: order.id }"
        :accept="DELIVERABLE_EXTENSIONS"
        :max-size-mb="20"
        :max-files="5"
      />
      <div>
        <UiButton :loading="busy === 'response'" @click="submit">{{ t('dashOps.sendReply') }}</UiButton>
      </div>
    </template>
  </section>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 12px; }
.title { font-size: 17px; font-weight: 700; margin: 0; }
.small { font-size: 12px; }
.published { display: flex; flex-direction: column; gap: 8px; background: var(--positive-100); border-radius: 12px; padding: 12px 14px; }
.published-head { display: flex; justify-content: space-between; gap: 8px; align-items: center; flex-wrap: wrap; }
.body { margin: 0; font-size: 14px; line-height: 1.8; color: var(--text-strong); }
</style>
