<script setup lang="ts">
/** Pick a new consultation slot (availability re-checked server-side). */
const open = defineModel<boolean>('open', { required: true })
defineProps<{ busy?: boolean }>()
const emit = defineEmits<{ submit: [slotStart: string] }>()

const { t } = useI18n()
const slot = shallowRef<string | null>(null)
watch(open, (v) => {
  if (v) slot.value = null
})
</script>

<template>
  <UiModal v-model:open="open" :title="t('account.modals.rescheduleTitle')" :description="t('account.modals.rescheduleText')">
    <div class="picker"><BookingSlotPicker v-if="open" v-model="slot" /></div>
    <template #footer>
      <UiButton variant="ghost" @click="open = false">{{ t('common.cancel') }}</UiButton>
      <UiButton :disabled="!slot" :loading="busy" @click="slot && emit('submit', slot)">{{ t('account.modals.rescheduleConfirm') }}</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.picker :deep(.kh-card) { padding: 0; border: none; }
</style>
