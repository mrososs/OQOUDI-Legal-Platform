<script setup lang="ts">
import type { Localized } from '#shared/domain/localized'

interface Contact { phone: string, email: string, hours: Localized, address: Localized }

/** Public contact details shown on the Contact page. */
const props = defineProps<{ value: Contact | null }>()
const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n()
const { call, toFailure } = useApi()
const toast = useToast()

const form = ref<Contact>(structuredClone(toRaw(props.value) ?? { phone: '', email: '', hours: { ar: '', en: '' }, address: { ar: '', en: '' } }))
const busy = shallowRef(false)
const error = shallowRef('')

async function save() {
  busy.value = true
  error.value = ''
  try {
    await call('/api/admin/settings/contact', { method: 'POST', body: { value: form.value } })
    toast.show(t('admin.settings.saved'))
    emit('saved')
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
  <form class="kh-card grid" @submit.prevent="save">
    <UiAlert v-if="error" class="full">{{ error }}</UiAlert>
    <UiInput v-model="form.phone" :label="t('contactPage.phone')" dir="ltr" required />
    <UiInput v-model="form.email" :label="t('contactPage.email')" type="email" dir="ltr" required />
    <div class="full"><AdminLocalizedInput v-model="form.hours" :label="t('contactPage.hours')" required /></div>
    <div class="full"><AdminLocalizedInput v-model="form.address" :label="t('contactPage.address')" required /></div>
    <div class="full end"><UiButton type="submit" :loading="busy">{{ t('common.save') }}</UiButton></div>
  </form>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 14px; }
.full { grid-column: 1 / -1; }
.end { display: flex; justify-content: flex-end; }
</style>
