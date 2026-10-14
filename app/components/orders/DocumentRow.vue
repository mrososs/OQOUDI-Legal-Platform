<script setup lang="ts">
import { Download, FileText } from '@lucide/vue'

/** One stored document. Download = server-issued 60 s signed URL (RLS-checked). */
const props = defineProps<{
  id: string
  name: string
  size: number
  meta?: string
  badge?: string
}>()

const { t } = useI18n()
const f = useFormat()
const { call } = useApi()
const toast = useToast()
const busy = shallowRef(false)

async function download() {
  busy.value = true
  try {
    const res = await call<{ url: string }>(`/api/documents/${props.id}/download`)
    window.location.assign(res.url)
  }
  catch (err) {
    toast.error((err as { message?: string }).message ?? t('errors.generic'))
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="row">
    <FileText :size="18" :stroke-width="1.8" class="icon" aria-hidden="true" />
    <span v-if="badge" class="badge">{{ badge }}</span>
    <span class="name">{{ name }}</span>
    <span class="meta">{{ meta ? `${meta} · ` : '' }}{{ f.bytes(size) }}</span>
    <button type="button" class="dl" :disabled="busy" :aria-label="t('documents.downloadAria', { name })" @click="download">
      <Download :size="16" :stroke-width="1.8" aria-hidden="true" />
      <span>{{ t('common.download') }}</span>
    </button>
  </div>
</template>

<style scoped>
.row {
  display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid var(--border-subtle);
  border-radius: 10px; padding: 10px 12px; flex-wrap: wrap;
}
.icon { color: var(--gold-600); flex-shrink: 0; }
.badge { font-size: 12px; font-weight: 700; color: var(--text-strong); background: var(--neutral-100); border-radius: 6px; padding: 2px 6px; }
.name { flex: 1 1 160px; font-size: 14px; color: var(--text-strong); overflow-wrap: anywhere; }
.meta { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.dl {
  display: inline-flex; gap: 6px; align-items: center; background: none; border: 1px solid var(--border-default);
  border-radius: 8px; padding: 6px 10px; font-size: 13px; color: var(--text-strong); cursor: pointer;
}
.dl:hover { background: var(--surface-sunken); }
.dl:disabled { opacity: .5; cursor: wait; }
</style>
