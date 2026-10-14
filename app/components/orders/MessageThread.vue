<script setup lang="ts">
import type { OrderDetail } from '~/repositories/orders'
import { MESSAGE_ATTACHMENT_EXTENSIONS } from '#shared/domain/uploads'
import type { UploadedFile } from '~/composables/useUpload'

/**
 * Order conversation. `viewer` decides which bubbles are "mine".
 * Sending goes through the server (the customer's reply to an info request
 * moves the order back to review automatically).
 */
const props = defineProps<{
  orderId: string
  messages: OrderDetail['messages']
  documents: OrderDetail['documents']
  viewer: 'customer' | 'staff'
  disabled?: boolean
  hint?: string
}>()

const emit = defineEmits<{ sent: [] }>()

const { t } = useI18n()
const f = useFormat()
const { call, toFailure } = useApi()

const body = shallowRef('')
const files = ref<UploadedFile[]>([])
const showAttach = shallowRef(false)
const busy = shallowRef(false)
const error = shallowRef('')

const attachmentsByMessage = computed(() => {
  const map = new Map<string, OrderDetail['documents']>()
  for (const d of props.documents) {
    if (d.messageId) map.set(d.messageId, [...(map.get(d.messageId) ?? []), d])
  }
  return map
})

function isMine(kind: string) {
  return props.viewer === 'customer' ? kind === 'customer' : kind !== 'customer'
}

async function send() {
  if (!body.value.trim()) return
  busy.value = true
  error.value = ''
  try {
    await call(`/api/orders/${props.orderId}/messages`, {
      method: 'POST',
      body: { body: body.value.trim(), documentIds: files.value.map(x => x.id) },
    })
    body.value = ''
    files.value = []
    showAttach.value = false
    emit('sent')
  }
  catch (err) {
    error.value = toFailure(err).message
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="thread">
    <div v-if="messages.length" class="list" aria-live="polite">
      <div v-for="m in messages" :key="m.id" class="msg" :class="{ mine: isMine(m.senderKind) }">
        <div class="meta">{{ t(`actors.${m.senderKind}`) }} · {{ f.dateTime(m.createdAt) }}</div>
        <div class="text prewrap">{{ m.body }}</div>
        <div v-if="attachmentsByMessage.get(m.id)?.length" class="atts">
          <OrdersDocumentRow
            v-for="d in attachmentsByMessage.get(m.id)"
            :id="d.id"
            :key="d.id"
            :name="d.originalName"
            :size="d.sizeBytes"
          />
        </div>
      </div>
    </div>
    <p v-else class="empty">{{ t('messages.empty') }}</p>

    <form v-if="!disabled" class="composer" @submit.prevent="send">
      <UiAlert v-if="error">{{ error }}</UiAlert>
      <div class="row">
        <label class="sr-only" :for="`msg-${orderId}`">{{ t('messages.placeholder') }}</label>
        <textarea
          :id="`msg-${orderId}`"
          v-model="body"
          class="kh-input input"
          rows="2"
          maxlength="5000"
          :placeholder="t('messages.placeholder')"
        />
        <UiButton type="submit" :loading="busy" :disabled="!body.trim()">{{ t('common.send') }}</UiButton>
      </div>
      <button type="button" class="attach-toggle" @click="showAttach = !showAttach">
        {{ showAttach ? t('messages.hideAttach') : t('messages.attach') }}
      </button>
      <FormsFileDropzone
        v-if="showAttach"
        v-model="files"
        :target="{ purpose: 'message', orderId }"
        :accept="MESSAGE_ATTACHMENT_EXTENSIONS"
        :max-size-mb="10"
        :max-files="5"
      />
      <p v-if="hint" class="hint">{{ hint }}</p>
    </form>
  </div>
</template>

<style scoped>
.thread { display: flex; flex-direction: column; gap: 12px; }
.list { display: flex; flex-direction: column; gap: 10px; }
.msg { max-width: 82%; align-self: flex-end; background: var(--neutral-100); border-radius: 12px; padding: 10px 14px; display: flex; flex-direction: column; gap: 4px; }
.msg.mine { align-self: flex-start; background: var(--ink-900); color: var(--cream-100); }
.meta { font-size: 11px; opacity: .75; }
.text { font-size: 14px; line-height: 1.7; }
.atts { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; color: var(--text-body); }
.empty { margin: 0; color: var(--text-muted); font-size: 14px; }
.composer { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--border-subtle); padding-top: 12px; }
.row { display: flex; gap: 8px; align-items: flex-end; }
.input { flex: 1; min-height: 48px; }
.attach-toggle { align-self: flex-start; background: none; border: none; color: var(--text-accent); cursor: pointer; font-size: 13px; padding: 0; }
.hint { margin: 0; font-size: 12px; color: var(--text-accent); }
</style>
