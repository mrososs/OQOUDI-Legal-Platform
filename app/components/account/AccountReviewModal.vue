<script setup lang="ts">
/** Star rating + optional comment for a completed order. */
const open = defineModel<boolean>('open', { required: true })
defineProps<{ serviceTitle: string, busy?: boolean }>()
const emit = defineEmits<{ submit: [rating: number, comment: string] }>()

const { t } = useI18n()
const f = useFormat()
const rating = shallowRef(0)
const comment = shallowRef('')
const error = shallowRef('')

watch(open, (v) => {
  if (v) {
    rating.value = 0
    comment.value = ''
    error.value = ''
  }
})

function submit() {
  if (rating.value < 1) {
    error.value = t('account.modals.rateRequired')
    return
  }
  emit('submit', rating.value, comment.value.trim())
}
</script>

<template>
  <UiModal v-model:open="open" :title="t('account.modals.rateTitle')">
    <p class="q">{{ t('account.modals.rateQuestion', { service: serviceTitle }) }}</p>
    <div class="stars" role="radiogroup" :aria-label="t('account.modals.rateTitle')">
      <button
        v-for="n in 5"
        :key="n"
        type="button"
        role="radio"
        class="star"
        :class="{ on: n <= rating }"
        :aria-checked="rating === n"
        :aria-label="t('reviews.starsAria', { n: f.number(n) })"
        @click="rating = n; error = ''"
      >
        ★
      </button>
    </div>
    <div class="hint">{{ rating ? t(`account.modals.rateHint${rating}`) : '' }}</div>
    <span v-if="error" class="kh-field__hint kh-field__hint--error" role="alert">{{ error }}</span>
    <UiTextarea v-model="comment" :label="t('account.modals.rateComment')" :rows="4" :maxlength="2000" />
    <template #footer>
      <UiButton variant="ghost" @click="open = false">{{ t('account.modals.rateLater') }}</UiButton>
      <UiButton :loading="busy" @click="submit">{{ t('account.modals.ratePublish') }}</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.q { margin: 0; font-size: 15px; }
/* Stars always read 1→5 left-to-right */
.stars { display: flex; gap: 6px; direction: ltr; justify-content: center; }
.star {
  width: 48px; height: 48px; border-radius: 12px; border: 1.5px solid var(--border-default); background: #fff;
  font-size: 26px; color: var(--neutral-300); cursor: pointer;
}
.star.on { border-color: var(--gold-400); color: var(--gold-400); }
.hint { font-size: 13px; color: var(--text-muted); text-align: center; min-height: 18px; }
</style>
