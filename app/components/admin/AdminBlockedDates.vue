<script setup lang="ts">
import type { AvailabilityException } from '~/repositories/admin'

/** Days off and blocked time ranges (Cairo dates). */
const props = defineProps<{ exceptions: AvailabilityException[] }>()
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const f = useFormat()
const { call, toFailure } = useApi()
const toast = useToast()

const today = cairoYmd(new Date())
const upcoming = computed(() => props.exceptions.filter(e => e.date >= today))

const form = reactive({ date: '', wholeDay: true, from: '12:00', to: '13:00', reason: '' })
const busy = shallowRef(false)
const error = shallowRef('')

async function add() {
  error.value = ''
  if (!form.date) {
    error.value = t('formErrors.invalidDate')
    return
  }
  busy.value = true
  try {
    await call('/api/admin/availability/exceptions', {
      method: 'POST',
      body: {
        date: form.date,
        startTime: form.wholeDay ? null : form.from,
        endTime: form.wholeDay ? null : form.to,
        reason: form.reason || null,
      },
    })
    form.date = ''
    form.reason = ''
    toast.success(t('admin.settings.saved'))
    emit('changed')
  }
  catch (err) {
    error.value = toFailure(err).message
  }
  finally {
    busy.value = false
  }
}

async function remove(id: string) {
  try {
    await call(`/api/admin/availability/exceptions/${id}`, { method: 'DELETE' })
    emit('changed')
  }
  catch (err) {
    toast.error(toFailure(err).message)
  }
}

const timeLabel = (hm: string) => f.time(`2026-01-01T${hm}:00+02:00`)
</script>

<template>
  <section class="kh-card wrap">
    <h2 class="h">{{ t('admin.blocked.title') }}</h2>
    <span class="muted small">{{ t('admin.blocked.lead') }}</span>
    <ul v-if="upcoming.length" class="list">
      <li v-for="e in upcoming" :key="e.id" class="item">
        <div>
          <strong class="strong">{{ f.ymd(e.date) }}</strong>
          <span class="muted"> · {{ e.startTime && e.endTime ? `${timeLabel(e.startTime)} – ${timeLabel(e.endTime)}` : t('admin.blocked.wholeDay') }}</span>
          <div v-if="e.reason" class="muted small">{{ e.reason }}</div>
        </div>
        <button type="button" class="del" @click="remove(e.id)">{{ t('admin.common.remove') }}</button>
      </li>
    </ul>
    <p v-else class="muted">{{ t('admin.blocked.empty') }}</p>

    <form class="add" @submit.prevent="add">
      <UiAlert v-if="error">{{ error }}</UiAlert>
      <div class="row">
        <UiInput v-model="form.date" :label="t('admin.blocked.date')" type="date" :min="today" required />
        <div class="kh-field">
          <span class="kh-field__label">{{ t('admin.blocked.scope') }}</span>
          <AdminSwitch v-model="form.wholeDay" :label="t('admin.blocked.wholeDay')" />
        </div>
        <template v-if="!form.wholeDay">
          <UiInput v-model="form.from" :label="t('admin.hours.from')" type="time" />
          <UiInput v-model="form.to" :label="t('admin.hours.to')" type="time" />
        </template>
        <UiInput v-model="form.reason" :label="t('admin.blocked.reason')" :placeholder="t('common.optional')" />
      </div>
      <div class="end"><UiButton type="submit" :loading="busy">{{ t('admin.blocked.add') }}</UiButton></div>
    </form>
  </section>
</template>

<style scoped>
.wrap { display: flex; flex-direction: column; gap: 10px; }
.h { font-size: 16px; font-weight: 700; margin: 0; }
.small { font-size: 13px; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.item { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--border-subtle); }
.strong { color: var(--text-strong); }
.del { background: none; border: none; color: var(--critical-500); cursor: pointer; }
.add { display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--border-subtle); padding-top: 12px; }
.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; align-items: end; }
.end { display: flex; justify-content: flex-end; }
</style>
