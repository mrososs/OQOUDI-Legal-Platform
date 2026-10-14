<script setup lang="ts">
import type { StaffExtras } from '~/repositories/dashboard'

/** Internal staff notes — never visible to customers (RLS: staff on the order only). */
defineProps<{
  notes: StaffExtras['notes']
  busy: boolean
}>()

const emit = defineEmits<{ add: [body: string] }>()

const { t } = useI18n()
const f = useFormat()
const draft = shallowRef('')

function submit() {
  if (!draft.value.trim()) return
  emit('add', draft.value.trim())
  draft.value = ''
}
</script>

<template>
  <section class="notes">
    <h2 class="title">{{ t('dashOps.notesTitle') }}</h2>
    <span class="muted small">{{ t('dashOps.notesHint') }}</span>
    <div v-for="n in notes" :key="n.id" class="note">
      <div class="body prewrap">{{ n.body }}</div>
      <div class="at">{{ f.dateTime(n.createdAt) }}</div>
    </div>
    <form class="form" @submit.prevent="submit">
      <label class="sr-only" for="note-input">{{ t('dashOps.notesTitle') }}</label>
      <input id="note-input" v-model="draft" class="kh-input input" maxlength="5000" :placeholder="t('dashOps.addNote')">
      <UiButton type="submit" variant="secondary" size="sm" :loading="busy" :disabled="!draft.trim()">{{ t('common.save') }}</UiButton>
    </form>
  </section>
</template>

<style scoped>
.notes {
  background: var(--cream-50); border: 1px solid var(--gold-200); border-radius: 20px; padding: 18px;
  display: flex; flex-direction: column; gap: 8px;
}
.title { font-size: 15px; font-weight: 700; margin: 0; }
.small { font-size: 12px; }
.note { background: #fff; border-radius: 10px; padding: 8px 10px; }
.body { line-height: 1.6; }
.at { font-size: 11px; color: var(--text-muted); }
.form { display: flex; gap: 6px; }
.input { flex: 1; padding: 8px 10px; }
</style>
