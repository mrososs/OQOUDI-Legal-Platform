<script setup lang="ts">
import { CalendarDays } from '@lucide/vue'
import { describeAnswers, type FormField } from '#shared/domain/formSchema'
import { localize } from '#shared/domain/localized'

const props = defineProps<{
  fields: FormField[]
  answers: Record<string, unknown>
  fileNames?: string[]
  meetingLabel?: string
  editable?: boolean
}>()

const emit = defineEmits<{ edit: [] }>()

const { t, locale } = useI18n()
const f = useFormat()

const rows = computed(() => describeAnswers(props.fields, props.answers, locale.value, v => localize(v, locale.value), ymd => f.ymd(ymd)))
</script>

<template>
  <div class="kh-card card">
    <div class="head">
      <h2 class="title">{{ t('checkout.reviewTitle') }}</h2>
      <button v-if="editable" type="button" class="edit" @click="emit('edit')">{{ t('common.edit') }}</button>
    </div>
    <div v-if="meetingLabel" class="meeting">
      <CalendarDays :size="22" :stroke-width="1.8" class="meeting-icon" aria-hidden="true" />
      <div>
        <div class="strong">{{ meetingLabel }}</div>
        <div class="muted small">{{ t('checkout.meetingMeta') }}</div>
      </div>
    </div>
    <dl class="answers">
      <div v-for="r in rows" :key="r.fieldId" class="row">
        <dt>{{ r.label }}</dt>
        <dd class="prewrap">{{ r.value }}</dd>
      </div>
    </dl>
    <div v-if="fileNames?.length" class="files">
      <span class="muted">{{ t('checkout.attachments') }}</span> {{ fileNames.join(locale === 'en' ? ', ' : '، ') }}
    </div>
  </div>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 14px; }
.head { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 20px; font-weight: 700; margin: 0; }
.edit { background: none; border: none; color: var(--text-accent); cursor: pointer; font-size: 15px; }
.meeting { display: flex; gap: 12px; align-items: center; background: var(--gold-50); border-radius: 12px; padding: 14px 16px; }
.meeting-icon { color: var(--gold-600); flex-shrink: 0; }
.strong { font-weight: 700; color: var(--text-strong); }
.small { font-size: 13px; }
.answers { margin: 0; display: flex; flex-direction: column; }
.row {
  display: grid; grid-template-columns: minmax(120px, 200px) 1fr; gap: 12px; padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle); font-size: 14px;
}
.row dt { color: var(--text-muted); }
.row dd { margin: 0; color: var(--text-strong); line-height: 1.7; }
.files { font-size: 14px; }
@media (max-width: 520px) { .row { grid-template-columns: 1fr; gap: 2px; } }
</style>
