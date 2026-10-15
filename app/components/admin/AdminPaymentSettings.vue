<script setup lang="ts">
import { manualPaymentSettingsSchema, type ManualPaymentSettings } from '#shared/domain/manualPayments'

/**
 * Transfer destinations shown at checkout. Changing them never switches
 * the payment mode: demo vs live is server configuration (PAYMENT_MODE).
 */
const props = defineProps<{ value: ManualPaymentSettings | null, demo: boolean }>()
const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n()
const { call, toFailure } = useApi()
const toast = useToast()

const form = ref<ManualPaymentSettings>(structuredClone(toRaw(props.value) ?? {
  instapay: { destination: '' },
  vodafone_cash: { destination: '' },
  paypal: { destination: '' },
  max_attempts: 3,
}))
const busy = shallowRef(false)
const errors = shallowRef<Record<string, string>>({})

async function save() {
  const parsed = manualPaymentSettingsSchema.safeParse({ ...form.value, max_attempts: Number(form.value.max_attempts) })
  if (!parsed.success) {
    errors.value = Object.fromEntries(parsed.error.issues.map(i => [i.path.join('.'), t('admin.mpay.settings.invalid')]))
    toast.warning(t('admin.mpay.settings.fixErrors'))
    return
  }
  errors.value = {}
  busy.value = true
  try {
    await call('/api/admin/settings/payments.manual', { method: 'POST', body: { value: parsed.data } })
    toast.success(t('admin.settings.saved'))
    emit('saved')
  }
  catch (err) {
    toast.error(toFailure(err).message)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="kh-card grid" novalidate @submit.prevent="save">
    <div class="full">
      <PaymentsPaymentDemoNotice v-if="demo" compact />
      <p class="muted note">{{ t('admin.mpay.settings.lead') }}</p>
    </div>
    <UiInput v-model="form.instapay.destination" :label="t('mpay.destination.instapay')" dir="ltr" :hint="t('admin.mpay.settings.emptyHint')" :error="errors['instapay.destination']" />
    <UiInput v-model="form.vodafone_cash.destination" :label="t('mpay.destination.vodafone_cash')" dir="ltr" inputmode="tel" :hint="t('admin.mpay.settings.emptyHint')" :error="errors['vodafone_cash.destination']" />
    <UiInput v-model="form.paypal.destination" :label="t('mpay.destination.paypal')" dir="ltr" type="email" :hint="t('admin.mpay.settings.paypalHint')" :error="errors['paypal.destination']" />
    <UiInput v-model.number="form.max_attempts" :label="t('admin.mpay.settings.maxAttempts')" type="number" min="1" max="10" :hint="t('admin.mpay.settings.maxAttemptsHint')" :error="errors.max_attempts" />
    <div class="full end"><UiButton type="submit" :loading="busy">{{ t('common.save') }}</UiButton></div>
  </form>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 14px; }
.full { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 10px; }
.note { margin: 0; font-size: 13px; line-height: 1.7; }
.end { align-items: flex-end; }
</style>
