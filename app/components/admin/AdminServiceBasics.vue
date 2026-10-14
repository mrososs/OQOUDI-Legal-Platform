<script setup lang="ts">
import type { AdminCategory } from '~/repositories/admin'
import type { ServiceDraft } from '~/composables/useServiceEditor'
import { SERVICE_KINDS } from '#shared/domain/serviceAdmin'

/** Tab 1 — basic information. */
const draft = defineModel<ServiceDraft>({ required: true })
const props = defineProps<{
  categories: AdminCategory[]
  issues: Record<string, string>
  isNew: boolean
}>()

const { t } = useI18n()
const f = useFormat()

function patch<K extends keyof ServiceDraft>(key: K, value: ServiceDraft[K]) {
  draft.value = { ...draft.value, [key]: value }
}

const categoryOptions = computed(() => props.categories.map(c => ({ value: c.id, label: f.text(c.title) })))
const kindOptions = computed(() => SERVICE_KINDS.map(k => ({ value: k, label: t(`admin.kinds.${k}`) })))
const extraCategories = computed(() => props.categories.filter(c => c.id !== draft.value.primaryCategoryId))

function issue(path: string) {
  const code = props.issues[path]
  return code ? t(`admin.issues.${code}`, t('admin.issues.invalid')) : ''
}

function toggleCategory(id: string) {
  const list = draft.value.categoryIds
  patch('categoryIds', list.includes(id) ? list.filter(x => x !== id) : [...list, id])
}

</script>

<template>
  <section class="kh-card grid">
    <div class="full">
      <AdminLocalizedInput
        :model-value="draft.title"
        :label="t('admin.basics.title')"
        required
        :error="issue('title.ar')"
        @update:model-value="v => patch('title', v)"
      />
    </div>
    <UiInput
      :model-value="draft.slug"
      :label="t('admin.basics.slug')"
      dir="ltr"
      required
      :hint="t('admin.basics.slugHint')"
      :error="issue('slug')"
      @update:model-value="v => patch('slug', String(v ?? '').toLowerCase())"
    />
    <UiSelect
      :model-value="draft.kind"
      :label="t('admin.basics.kind')"
      :options="kindOptions"
      :disabled="!isNew"
      :hint="isNew ? undefined : t('admin.basics.kindLocked')"
      @update:model-value="v => patch('kind', v as ServiceDraft['kind'])"
    />
    <UiSelect
      :model-value="draft.primaryCategoryId"
      :label="t('admin.basics.primaryCategory')"
      :options="categoryOptions"
      :error="issue('primaryCategoryId')"
      @update:model-value="v => patch('primaryCategoryId', String(v))"
    />
    <div class="kh-field">
      <span class="kh-field__label">{{ t('admin.basics.extraCategories') }}</span>
      <div class="chips">
        <button
          v-for="c in extraCategories"
          :key="c.id"
          type="button"
          class="chip"
          :aria-pressed="draft.categoryIds.includes(c.id)"
          @click="toggleCategory(c.id)"
        >
          {{ f.text(c.title) }}
        </button>
      </div>
    </div>
    <div class="full">
      <AdminLocalizedInput
        :model-value="draft.shortDescription"
        :label="t('admin.basics.short')"
        multiline
        required
        :error="issue('shortDescription.ar')"
        @update:model-value="v => patch('shortDescription', v)"
      />
    </div>
    <div class="full">
      <AdminLocalizedInput
        :model-value="draft.deliveryEstimate"
        :label="t('admin.basics.duration')"
        :placeholder="t('admin.basics.durationPlaceholder')"
        required
        :error="issue('deliveryEstimate.ar')"
        @update:model-value="v => patch('deliveryEstimate', v)"
      />
    </div>
    <UiSelect
      v-if="draft.kind === 'video_consultation'"
      :model-value="String(draft.meetingDurationMinutes ?? 30)"
      :label="t('admin.basics.meetingDuration')"
      :options="[15, 30, 45, 60].map(m => ({ value: String(m), label: t('admin.basics.minutes', { n: f.number(m) }) }))"
      @update:model-value="v => patch('meetingDurationMinutes', Number(v))"
    />
    <UiInput
      :model-value="draft.sortOrder"
      :label="t('admin.basics.sortOrder')"
      type="number"
      min="0"
      @update:model-value="v => patch('sortOrder', Math.max(0, Math.trunc(Number(v) || 0)))"
    />
    <div class="kh-field">
      <span class="kh-field__label">{{ t('admin.basics.visibility') }}</span>
      <AdminSwitch
        :model-value="draft.isFeatured"
        :label="t('admin.basics.featured')"
        @update:model-value="v => patch('isFeatured', v)"
      />
    </div>
  </section>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 16px; max-width: 900px; }
.full { grid-column: 1 / -1; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip {
  padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border-default); background: #fff;
  font-size: 13px; cursor: pointer; color: var(--text-body);
}
.chip[aria-pressed='true'] { background: var(--ink-900); color: var(--cream-100); border-color: var(--ink-900); }
</style>
