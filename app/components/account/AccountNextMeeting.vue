<script setup lang="ts">
import type { OrderListItem } from '~/repositories/orders'

/** Dark card with the next confirmed video consultation. */
const props = defineProps<{ order: OrderListItem, lawyerName?: string | null }>()

const { t } = useI18n()
const f = useFormat()
const when = computed(() => (props.order.booking ? `${f.day(props.order.booking.startsAt)}، ${f.time(props.order.booking.startsAt)}` : ''))
</script>

<template>
  <section v-if="order.booking" class="meeting">
    <div class="label">{{ t('account.nextMeeting') }}</div>
    <div class="when">{{ when }}</div>
    <div class="meta">{{ t('account.meetingMeta') }}<template v-if="lawyerName"> · {{ lawyerName }}</template></div>
    <UiButton v-if="order.booking.meetingUrl" variant="inverse" size="sm" :href="order.booking.meetingUrl" target="_blank" rel="noopener">
      {{ t('account.joinMeeting') }}
    </UiButton>
    <div v-else class="pending">{{ t('account.linkPending') }}</div>
    <NuxtLinkLocale :to="`/account/orders/${order.orderNumber}`" class="details">{{ t('account.meetingDetailsArrow') }}</NuxtLinkLocale>
  </section>
</template>

<style scoped>
.meeting { background: var(--ink-900); color: var(--cream-100); border-radius: 20px; padding: 22px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
.label { font-size: 13px; color: var(--gold-300); }
.when { font-family: var(--font-heading); font-size: 20px; font-weight: 700; color: #fff; }
.meta { font-size: 14px; color: var(--gold-200); }
.pending { font-size: 13px; background: rgba(248, 225, 196, 0.1); border-radius: 10px; padding: 10px 12px; align-self: stretch; }
.details { font-size: 13px; color: var(--gold-300); }
.details:hover { color: #fff; }
</style>
