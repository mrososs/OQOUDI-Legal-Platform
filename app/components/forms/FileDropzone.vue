<script setup lang="ts">
import { FileText, Upload } from '@lucide/vue'
import { fileExtension, type AllowedExtension } from '#shared/domain/uploads'
import type { UploadedFile, UploadTarget } from '~/composables/useUpload'

/**
 * Drag & drop multi-file uploader. Validates type/size/count locally for
 * instant feedback; the server re-validates everything.
 */
const files = defineModel<UploadedFile[]>({ default: () => [] })

const props = withDefaults(defineProps<{
  target: UploadTarget
  accept: readonly AllowedExtension[]
  maxSizeMb: number
  maxFiles: number
  label?: string
  required?: boolean
  error?: string
  hint?: string
}>(), {})

const emit = defineEmits<{ error: [message: string] }>()

const { t, locale } = useI18n()
const f = useFormat()
const { upload } = useUpload()
const { toFailure } = useApi()

const inputId = useId()
const uploading = ref<{ key: string, name: string }[]>([])
const localError = shallowRef('')
const dragging = shallowRef(false)

const acceptLabel = computed(() => [...new Set(props.accept.map(a => (a === 'jpeg' ? 'jpg' : a).toUpperCase()))].join(locale.value === 'en' ? ', ' : '، '))
const acceptAttr = computed(() => props.accept.map(a => `.${a}`).join(','))
const shownError = computed(() => localError.value || props.error || '')

async function addFiles(list: FileList | File[]) {
  localError.value = ''
  for (const file of Array.from(list)) {
    const ext = fileExtension(file.name)
    if (!(props.accept as readonly string[]).includes(ext)) {
      localError.value = t('upload.typeNotAllowed', { name: file.name, types: acceptLabel.value })
      continue
    }
    if (file.size > props.maxSizeMb * 1024 * 1024) {
      localError.value = t('upload.tooLarge', { name: file.name, max: f.number(props.maxSizeMb) })
      continue
    }
    if (files.value.length + uploading.value.length >= props.maxFiles) {
      localError.value = t('upload.tooMany', { max: f.number(props.maxFiles) })
      break
    }
    const key = `${file.name}-${file.size}-${Date.now()}`
    uploading.value = [...uploading.value, { key, name: file.name }]
    try {
      const done = await upload(file, props.target)
      files.value = [...files.value, done]
    }
    catch (err) {
      localError.value = toFailure(err).message || t('upload.failed', { name: file.name })
      emit('error', localError.value)
    }
    finally {
      uploading.value = uploading.value.filter(u => u.key !== key)
    }
  }
}

function onChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) addFiles(input.files)
  input.value = ''
}

function onDrop(e: DragEvent) {
  dragging.value = false
  if (e.dataTransfer?.files) addFiles(e.dataTransfer.files)
}

function remove(id: string) {
  files.value = files.value.filter(x => x.id !== id)
}

defineExpose({ busy: computed(() => uploading.value.length > 0) })
</script>

<template>
  <div class="kh-field">
    <span v-if="label" class="kh-field__label">{{ label }}<span v-if="required" aria-hidden="true"> *</span></span>
    <label
      :for="inputId"
      class="zone"
      :class="{ 'zone--error': !!shownError, 'zone--drag': dragging }"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <input :id="inputId" type="file" multiple :accept="acceptAttr" class="sr-only" @change="onChange">
      <Upload :size="26" :stroke-width="1.7" class="zone-icon" aria-hidden="true" />
      <span class="zone-title">{{ t('upload.dropTitle') }}</span>
      <span class="zone-sub">{{ t('upload.limits', { types: acceptLabel, max: f.number(maxSizeMb) }) }}</span>
    </label>

    <div v-if="files.length || uploading.length" class="list">
      <div v-for="file in files" :key="file.id" class="file">
        <FileText :size="18" :stroke-width="1.8" class="file-icon" aria-hidden="true" />
        <span class="file-name">{{ file.name }}</span>
        <span class="file-size">{{ f.bytes(file.size) }}</span>
        <button type="button" class="remove" :aria-label="t('upload.remove', { name: file.name })" @click="remove(file.id)">×</button>
      </div>
      <div v-for="u in uploading" :key="u.key" class="file file--pending" aria-live="polite">
        <span class="spinner" aria-hidden="true" />
        <span class="file-name">{{ u.name }}</span>
        <span class="file-size">{{ t('upload.uploading') }}</span>
      </div>
    </div>

    <span v-if="shownError" class="kh-field__hint kh-field__hint--error" role="alert">{{ shownError }}</span>
    <span v-else-if="hint" class="kh-field__hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.zone {
  display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 16px;
  border: 1.5px dashed var(--border-default); border-radius: 14px; background: var(--neutral-50);
  cursor: pointer; text-align: center; transition: var(--transition-base);
}
.zone:hover, .zone--drag { border-color: var(--gold-500); background: var(--gold-50); }
.zone:focus-within { box-shadow: var(--shadow-focus); }
.zone--error { border-color: var(--critical-500); }
.zone-icon { color: var(--gold-600); }
.zone-title { font-size: 15px; font-weight: 600; color: var(--text-strong); }
.zone-sub { font-size: 12px; color: var(--text-muted); }
.list { display: flex; flex-direction: column; gap: 6px; }
.file {
  display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid var(--border-subtle);
  border-radius: 10px; padding: 10px 12px;
}
.file--pending { opacity: 0.75; }
.file-icon { color: var(--gold-600); flex-shrink: 0; }
.file-name { flex: 1; font-size: 14px; color: var(--text-strong); overflow-wrap: anywhere; }
.file-size { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.remove { background: none; border: none; font-size: 18px; color: var(--text-muted); cursor: pointer; padding: 0 4px; }
.spinner {
  width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--gold-400);
  border-inline-end-color: transparent; animation: spin 0.8s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
