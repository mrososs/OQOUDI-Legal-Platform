<script setup lang="ts">
import { ImagePlus, RefreshCw, Sparkles, Trash2 } from '@lucide/vue'
import { PROOF_ACCEPT_ATTR, PROOF_MAX_BYTES } from '#shared/domain/manualPayments'

/**
 * Step 4: required proof image. Drag & drop or browse, preview, replace or
 * remove, progress while uploading. Validation runs in the parent
 * composable (setFile) so the same rules apply to every entry point.
 */
const props = defineProps<{
  file: File | null
  error?: string
  progress: number
  uploading: boolean
  disabled?: boolean
  /** Demo mode offers a generated, clearly labelled sample proof. */
  allowSample?: boolean
  sampleBusy?: boolean
}>()
const emit = defineEmits<{ select: [file: File | null], sample: [] }>()

const { t } = useI18n()
const f = useFormat()
const inputId = useId()
const hintId = useId()
const inputRef = useTemplateRef<HTMLInputElement>('input')
const dragging = shallowRef(false)
const previewUrl = shallowRef<string | null>(null)

watch(() => props.file, (file, _old, onCleanup) => {
  if (!import.meta.client || !file) {
    previewUrl.value = null
    return
  }
  const url = URL.createObjectURL(file)
  previewUrl.value = url
  onCleanup(() => URL.revokeObjectURL(url))
}, { immediate: true })

const maxLabel = computed(() => f.number(PROOF_MAX_BYTES / (1024 * 1024)))

function browse() {
  if (!props.disabled) inputRef.value?.click()
}

function onChange(e: Event) {
  const input = e.target as HTMLInputElement
  const picked = input.files?.[0] ?? null
  input.value = ''
  if (picked) emit('select', picked)
}

function onDrop(e: DragEvent) {
  dragging.value = false
  if (props.disabled) return
  const picked = e.dataTransfer?.files?.[0]
  if (picked) emit('select', picked)
}
</script>

<template>
  <div class="proof">
    <label :for="inputId" class="label">{{ t('mpay.proof.label') }} <span class="req" aria-hidden="true">*</span></label>
    <input
      :id="inputId"
      ref="input"
      type="file"
      class="visually-hidden"
      :accept="PROOF_ACCEPT_ATTR"
      :disabled="disabled"
      :aria-describedby="hintId"
      :aria-invalid="!!error"
      required
      @change="onChange"
    >

    <div v-if="file && previewUrl" class="preview">
      <img :src="previewUrl" :alt="t('mpay.proof.previewAlt')" class="thumb">
      <div class="meta">
        <div class="name" dir="ltr">{{ file.name }}</div>
        <div class="muted small">{{ f.bytes(file.size) }}</div>
        <div v-if="uploading" class="bar" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" :aria-label="t('mpay.proof.uploading', { pct: f.number(progress) })">
          <span class="bar-fill" :style="{ width: `${progress}%` }" />
        </div>
        <div v-if="uploading" class="muted small" aria-live="polite">{{ t('mpay.proof.uploading', { pct: f.number(progress) }) }}</div>
        <div v-else class="row">
          <UiButton variant="secondary" size="sm" :disabled="disabled" @click="browse">
            <RefreshCw :size="14" aria-hidden="true" /> {{ t('mpay.proof.replace') }}
          </UiButton>
          <UiButton variant="ghost" size="sm" :disabled="disabled" @click="emit('select', null)">
            <Trash2 :size="14" aria-hidden="true" /> {{ t('mpay.proof.remove') }}
          </UiButton>
        </div>
      </div>
    </div>

    <div
      v-else
      class="drop"
      :class="{ dragging, invalid: !!error, disabled }"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <ImagePlus :size="30" :stroke-width="1.6" aria-hidden="true" class="drop-icon" />
      <div class="drop-title">{{ t('mpay.proof.drop') }}</div>
      <UiButton variant="secondary" size="sm" :disabled="disabled" @click="browse">{{ t('mpay.proof.browse') }}</UiButton>
    </div>

    <p :id="hintId" class="hint" :class="{ 'hint--error': !!error }" :role="error ? 'alert' : undefined">
      {{ error || t('mpay.proof.hint', { max: maxLabel }) }}
    </p>

    <div v-if="allowSample && !file" class="sample">
      <UiButton variant="ghost" size="sm" :loading="sampleBusy" :disabled="disabled" @click="emit('sample')">
        <Sparkles :size="14" aria-hidden="true" /> {{ t('mpay.proof.sample') }}
      </UiButton>
      <span class="muted small">{{ t('mpay.proof.sampleNote') }}</span>
    </div>
  </div>
</template>

<style scoped>
.proof { display: flex; flex-direction: column; gap: 10px; }
.label { font-weight: 700; color: var(--text-strong); font-size: 15px; }
.req { color: var(--critical-500); }
.small { font-size: 12px; }
.drop {
  border: 2px dashed var(--border-strong); border-radius: 16px; padding: 28px 16px; background: var(--neutral-50);
  display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center;
  transition: border-color var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard);
}
.drop.dragging { border-color: var(--gold-500); background: var(--gold-50); }
.drop.invalid { border-color: var(--critical-500); background: var(--critical-100); }
.drop.disabled { opacity: 0.6; }
.drop-icon { color: var(--gold-600); }
.drop-title { font-weight: 700; color: var(--text-strong); }
.preview { display: flex; gap: 14px; align-items: flex-start; border: 1px solid var(--border-subtle); border-radius: 16px; padding: 12px; background: var(--surface-card); flex-wrap: wrap; }
.thumb { width: 120px; height: 150px; object-fit: cover; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--neutral-100); }
.meta { flex: 1 1 180px; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.name { font-weight: 700; color: var(--text-strong); overflow-wrap: anywhere; text-align: start; }
.row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.bar { height: 8px; border-radius: 999px; background: var(--neutral-200); overflow: hidden; }
.bar-fill { display: block; height: 100%; background: var(--gold-500); transition: width var(--duration-fast) linear; }
.hint { margin: 0; font-size: 12px; color: var(--text-muted); }
.hint--error { color: var(--critical-500); font-weight: 600; }
.sample { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
