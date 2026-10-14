<script setup lang="ts">
import type { StaffReviewRow } from '~/repositories/admin'

/** One customer review with an optional public reply editor. */
const props = defineProps<{ review: StaffReviewRow, canReply: boolean }>()
const emit = defineEmits<{ replied: [] }>()

const { t } = useI18n()
const f = useFormat()
const { call, toFailure } = useApi()
const toast = useToast()

const editing = shallowRef(false)
const text = shallowRef(props.review.reply ?? '')
const busy = shallowRef(false)
const error = shallowRef('')

async function save() {
  busy.value = true
  error.value = ''
  try {
    await call(`/api/reviews/${props.review.id}/reply`, { method: 'POST', body: { reply: text.value } })
    editing.value = false
    toast.show(t('admin.reviews.replySaved'))
    emit('replied')
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
  <article class="kh-card card">
    <div class="head">
      <div class="who">
        <strong class="strong">{{ review.displayName }}</strong>
        <SharedStarRating :value="review.rating" />
      </div>
      <span class="meta">
        {{ f.text(review.serviceTitle) }}
        <template v-if="review.orderNumber"> · <span class="ltr">{{ review.orderNumber }}</span></template>
        · {{ f.date(review.createdAt) }}
      </span>
    </div>
    <p v-if="review.comment" class="text prewrap">{{ review.comment }}</p>
    <div v-if="review.reply && !editing" class="reply">
      <strong class="strong">{{ t('admin.reviews.yourReply') }}</strong> {{ review.reply }}
      <button v-if="canReply" type="button" class="link small" @click="editing = true">{{ t('admin.reviews.editReply') }}</button>
    </div>
    <form v-if="editing" class="editor" @submit.prevent="save">
      <label class="sr-only" :for="`reply-${review.id}`">{{ t('admin.reviews.reply') }}</label>
      <input :id="`reply-${review.id}`" v-model="text" class="kh-input grow" maxlength="2000" :placeholder="t('admin.reviews.placeholder')">
      <UiButton type="submit" size="sm" :loading="busy">{{ t('admin.reviews.publishReply') }}</UiButton>
      <UiButton variant="ghost" size="sm" @click="editing = false">{{ t('common.cancel') }}</UiButton>
    </form>
    <UiAlert v-if="error">{{ error }}</UiAlert>
    <button v-if="canReply && !review.reply && !editing" type="button" class="link strong-link" @click="editing = true">{{ t('admin.reviews.reply') }}</button>
  </article>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 8px; }
.head { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.who { display: flex; gap: 10px; align-items: center; }
.strong { color: var(--text-strong); }
.meta { font-size: 12px; color: var(--text-muted); }
.text { margin: 0; line-height: 1.7; color: var(--text-strong); }
.reply { background: var(--neutral-100); border-radius: 10px; padding: 10px 12px; font-size: 14px; }
.editor { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.grow { flex: 1 1 240px; }
.link { background: none; border: none; padding: 0; color: var(--text-accent); cursor: pointer; }
.small { font-size: 12px; margin-inline-start: 6px; }
.strong-link { align-self: flex-start; font-weight: 600; }
</style>
