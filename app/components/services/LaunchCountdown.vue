<script setup lang="ts">
import { Clock } from '@lucide/vue'

/**
 * «متبقي على انتهاء العرض: 12 يوم، 08 ساعات، 35 دقيقة».
 * Driven by the shared server-anchored clock (useLaunchCampaign): it is the same for every
 * visitor, survives page refreshes, and renders identically on server and client.
 */
defineProps<{ tone?: 'light' | 'dark' }>()

const { t, locale } = useI18n()
const { active, remaining, endsAt } = useLaunchCampaign()
const text = computed(() => formatRemaining(remaining.value, locale.value))
</script>

<template>
  <span v-if="active" class="countdown" :class="`countdown--${tone ?? 'light'}`" role="timer" aria-live="off">
    <Clock :size="15" :stroke-width="1.9" aria-hidden="true" />
    <span>{{ t('launch.countdownLabel') }}</span>
    <time class="value" :datetime="endsAt ?? undefined">{{ text }}</time>
  </span>
</template>

<style scoped>
.countdown { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; flex-wrap: wrap; }
.countdown svg { flex-shrink: 0; }
.value { font-weight: 700; font-variant-numeric: tabular-nums; }
.countdown--light { color: var(--text-body); }
.countdown--light svg { color: var(--gold-500); }
.countdown--light .value { color: var(--text-strong); }
.countdown--dark { color: var(--cream-100); }
.countdown--dark svg { color: var(--gold-300); }
.countdown--dark .value { color: #fff; }
</style>
