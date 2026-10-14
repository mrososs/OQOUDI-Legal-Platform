<script setup lang="ts">
import type { OrderListItem } from '~/repositories/orders'
import type { OrderStatus } from '#shared/domain/orderStatus'

/** Staff orders table. Rows link to the request detail page. */
const props = withDefaults(defineProps<{
  orders: OrderListItem[]
  names: Record<string, string>
  showDate?: boolean
  emptyText?: string
}>(), { showDate: true, emptyText: undefined })

const { t } = useI18n()
const f = useFormat()
const localePath = useLocalePath()

const ACTION: OrderStatus[] = ['new', 'under_review', 'revision']
const OVERDUE_DAYS = 5

function open(href: string) {
  navigateTo(href)
}

const rows = computed(() => props.orders.map((o) => {
  const ageDays = (Date.now() - new Date(o.createdAt).getTime()) / 86400000
  const missingLink = !!o.booking && o.booking.status === 'confirmed' && !o.booking.meetingUrl
  return {
    ...o,
    href: localePath(`/dashboard/requests/${o.orderNumber}`),
    customer: props.names[o.customerAccountId] ?? '—',
    needsAction: ACTION.includes(o.status) || missingLink,
    overdue: (o.status === 'under_review' || o.status === 'in_progress') && ageDays > OVERDUE_DAYS,
    meet: o.booking
      ? `${f.day(o.booking.startsAt)}، ${f.time(o.booking.startsAt)}${missingLink ? ` · ${t('dashOps.noLink')}` : ''}`
      : '',
  }
}))
</script>

<template>
  <div class="scroll">
    <table class="table">
      <thead>
        <tr>
          <th scope="col">{{ t('dashOps.table.order') }}</th>
          <th scope="col">{{ t('dashOps.table.customer') }}</th>
          <th scope="col">{{ t('dashOps.table.service') }}</th>
          <th v-if="showDate" scope="col">{{ t('dashOps.table.date') }}</th>
          <th scope="col">{{ t('dashOps.table.status') }}</th>
          <th scope="col">{{ t('dashOps.table.payment') }}</th>
          <th scope="col">{{ t('dashOps.table.amount') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="r in rows"
          :key="r.id"
          :class="{ action: r.needsAction }"
          @click="open(r.href)"
        >
          <td class="strong">
            <NuxtLink :to="r.href" class="row-link ltr" @click.stop>{{ r.orderNumber }}</NuxtLink>
          </td>
          <td>{{ r.customer }}</td>
          <td>
            {{ f.text(r.service.title) }}
            <div v-if="r.meet" class="sub">{{ r.meet }}</div>
          </td>
          <td v-if="showDate">
            {{ f.date(r.createdAt) }}
            <UiBadge v-if="r.overdue" tone="critical">{{ t('dashOps.overdue') }}</UiBadge>
          </td>
          <td><OrdersOrderStatusBadge :status="r.status" /></td>
          <td><OrdersPaymentBadge :status="r.paymentStatus" /></td>
          <td class="nowrap">{{ f.money(r.totalMinor) }}</td>
        </tr>
      </tbody>
    </table>
    <div v-if="!rows.length" class="empty">{{ emptyText ?? t('dashOps.noOrders') }}</div>
  </div>
</template>

<style scoped>
.scroll { overflow-x: auto; overflow-y: hidden; }
.table { width: 100%; border-collapse: collapse; min-width: 860px; font-size: 14px; }
thead tr { background: var(--neutral-100); text-align: start; color: var(--text-muted); }
th { padding: 10px 16px; font-weight: 600; text-align: start; }
td { padding: 12px 16px; vertical-align: top; }
tbody tr { border-top: 1px solid var(--border-subtle); cursor: pointer; background: #fff; }
tbody tr:hover { background: var(--neutral-50); }
tbody tr.action { background: var(--cream-50); }
.strong { font-weight: 600; color: var(--text-strong); }
.row-link { color: var(--text-strong); }
.sub { font-size: 12px; color: var(--text-muted); }
.nowrap { white-space: nowrap; }
.empty { padding: 40px; text-align: center; color: var(--text-muted); }
</style>
