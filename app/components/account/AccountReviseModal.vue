<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })
defineProps<{ busy?: boolean }>()
const emit = defineEmits<{ submit: [reason: string] }>()

const { t } = useI18n()
const f = useFormat()
const reason = shallowRef('')
const error = shallowRef('')

watch(open, (v) => {
  if (v) {
    reason.value = ''
    error.value = ''
  }
})

function submit() {
  if (reason.value.trim().length < 5) {
    error.value = t('formErrors.minLength', { min: f.number(5) })
    return
  }
  emit('submit', reason.value.trim())
}
</script>

<template>
  <UiModal v-model:open="open" :title="t('account.modals.reviseTitle')" :description="t('account.modals.reviseText')">
    <UiTextarea
      v-model="reason"
      :label="t('account.modals.reviseLabel')"
      :placeholder="t('account.modals.revisePlaceholder')"
      required
      :maxlength="3000"
      :error="error"
    />
    <template #footer>
      <UiButton variant="ghost" @click="open = false">{{ t('common.cancel') }}</UiButton>
      <UiButton :loading="busy" @click="submit">{{ t('account.modals.reviseSubmit') }}</UiButton>
    </template>
  </UiModal>
</template>
