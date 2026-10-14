<script setup lang="ts">
import type { OrderDetail } from '~/repositories/orders'

/** Durable history (order_events) rendered as a timeline. */
const props = defineProps<{ events: OrderDetail['events'] }>()

const { t, te } = useI18n()
const f = useFormat()

const items = computed(() => [...props.events].reverse().map((e) => {
  let label: string
  if (e.type === 'order.status_changed' && e.toStatus) {
    label = t('events.statusChanged', { status: t(`status.${e.toStatus}.label`) })
  }
  else {
    const key = `events.${e.type.replace('.', '_')}`
    label = te(key) ? t(key, { version: f.number(Number(e.details.version ?? 0)) }) : e.type
  }
  const d = e.details as Record<string, unknown>
  let detail = ''
  if (typeof d.receiptNumber === 'string') detail = t('events.receipt', { n: d.receiptNumber })
  else if (typeof d.slotStart === 'string') detail = `${f.day(d.slotStart)}، ${f.time(d.slotStart)}`
  else if (typeof d.to === 'string') detail = `${f.day(d.to)}، ${f.time(d.to)}`
  else if (typeof d.note === 'string' && d.note) detail = d.note
  else if (typeof d.reason === 'string' && d.reason && !['accepted', 'info_provided'].includes(d.reason)) detail = d.reason
  return { id: e.id, label, detail, at: f.dateTime(e.createdAt), by: t(`actors.${e.actorKind}`), staffOnly: e.visibility === 'staff' }
}))
</script>

<template>
  <ol class="timeline">
    <li v-for="i in items" :key="i.id" class="item">
      <span class="dot" aria-hidden="true" />
      <div class="body">
        <div class="label">
          {{ i.label }}
          <UiBadge v-if="i.staffOnly" tone="neutral">{{ t('events.staffOnly') }}</UiBadge>
        </div>
        <div v-if="i.detail" class="detail prewrap">{{ i.detail }}</div>
        <div class="meta">{{ i.at }} · {{ i.by }}</div>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.timeline { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; }
.item { display: flex; gap: 12px; padding: 0 0 18px; position: relative; }
.item:not(:last-child)::before {
  content: ''; position: absolute; inset-inline-start: 5px; top: 14px; bottom: 0; width: 1px; background: var(--border-default);
}
.dot { width: 11px; height: 11px; border-radius: 50%; background: var(--gold-400); margin-top: 6px; flex-shrink: 0; }
.label { font-weight: 600; color: var(--text-strong); font-size: 14px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.detail { font-size: 13px; color: var(--text-body); line-height: 1.7; }
.meta { font-size: 12px; color: var(--text-muted); }
</style>
