<script setup lang="ts">
import { ExternalLink } from '@lucide/vue'

/** Shows a payment proof from a short-lived signed URL. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ submissionId: string | null, demo?: boolean }>()
const { t } = useI18n()
const preview = useProofPreview()

watch([open, () => props.submissionId], ([isOpen, id]) => {
  if (isOpen && id) preview.load(id)
  else preview.clear()
}, { immediate: true })
</script>

<template>
  <UiModal v-model:open="open" :title="t('mpay.proof.viewTitle')">
    <PaymentsPaymentDemoNotice v-if="demo" compact />
    <div class="frame">
      <div v-if="preview.loading.value" class="muted">{{ t('common.loading') }}</div>
      <img v-else-if="preview.url.value" :src="preview.url.value" :alt="t('mpay.proof.previewAlt')" class="img">
      <div v-else class="muted">{{ t('mpay.proof.unavailable') }}</div>
    </div>
    <template #footer>
      <UiButton v-if="preview.url.value" variant="secondary" :href="preview.url.value" target="_blank" rel="noopener noreferrer">
        <ExternalLink :size="14" aria-hidden="true" /> {{ t('mpay.proof.openFull') }}
      </UiButton>
      <UiButton variant="ghost" @click="open = false">{{ t('common.close') }}</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.frame { min-height: 200px; display: flex; align-items: center; justify-content: center; background: var(--neutral-100); border-radius: 12px; padding: 8px; }
.img { max-width: 100%; max-height: 65vh; object-fit: contain; border-radius: 8px; }
</style>
