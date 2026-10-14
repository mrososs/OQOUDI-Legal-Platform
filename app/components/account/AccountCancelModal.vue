<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })
defineProps<{ busy?: boolean }>()
const emit = defineEmits<{ submit: [reason: string] }>()

const { t } = useI18n()
const reason = shallowRef('')
watch(open, (v) => {
  if (v) reason.value = ''
})
</script>

<template>
  <UiModal v-model:open="open" :title="t('account.modals.cancelTitle')" :description="t('account.modals.cancelText')">
    <UiTextarea v-model="reason" :label="t('account.modals.cancelReason')" :rows="3" :maxlength="1000" />
    <template #footer>
      <UiButton variant="ghost" @click="open = false">{{ t('account.modals.cancelKeep') }}</UiButton>
      <UiButton variant="danger" :loading="busy" @click="emit('submit', reason.trim())">{{ t('account.modals.cancelConfirm') }}</UiButton>
    </template>
  </UiModal>
</template>
