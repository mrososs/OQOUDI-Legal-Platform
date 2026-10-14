<script setup lang="ts">
import type { NotificationItem } from '~/repositories/account'

/** One notification row; emits `open` so the parent marks it read and navigates. */
const props = withDefaults(defineProps<{ item: NotificationItem, compact?: boolean }>(), { compact: false })
const emit = defineEmits<{ open: [item: NotificationItem] }>()

const f = useFormat()
const text = useNotificationText()
const label = computed(() => text(props.item.type, props.item.payload))
const orderNumber = computed(() => (typeof props.item.payload.orderNumber === 'string' ? props.item.payload.orderNumber : ''))
</script>

<template>
  <button type="button" class="item" :class="{ unread: !item.readAt, compact }" @click="emit('open', item)">
    <span class="dot" aria-hidden="true" />
    <span class="body">
      <span class="text">{{ label }}</span>
      <span class="meta">{{ f.dateTime(item.createdAt) }}<template v-if="orderNumber && !compact"> · <span class="ltr">{{ orderNumber }}</span></template></span>
    </span>
  </button>
</template>

<style scoped>
.item {
  display: flex; gap: 12px; width: 100%; text-align: start; background: #fff; border: none;
  border-bottom: 1px solid var(--border-subtle); padding: 16px 20px; cursor: pointer; font-family: inherit;
}
.item.unread { background: var(--cream-50); }
.item:hover { background: var(--surface-sunken); }
.item.compact { padding: 12px 0 2px; border-bottom: none; border-top: 1px solid var(--border-subtle); background: none; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--neutral-300); margin-top: 8px; flex-shrink: 0; }
.unread .dot { background: var(--gold-400); }
.body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.text { font-size: 15px; line-height: 1.6; color: var(--text-strong); }
.unread .text { font-weight: 600; }
.compact .text { font-size: 14px; }
.meta { font-size: 12px; color: var(--text-muted); }
</style>
