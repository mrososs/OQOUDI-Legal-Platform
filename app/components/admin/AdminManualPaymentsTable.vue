<script setup lang="ts">
import type { AdminSubmission } from '~/composables/useAdminManualPayments'

/** Manual payment submissions table; a row opens the review panel. */
defineProps<{ rows: AdminSubmission[], loading?: boolean }>()
const emit = defineEmits<{ review: [id: string] }>()
const { t } = useI18n()
const f = useFormat()
</script>

<template>
  <div class="kh-card table-card" :aria-busy="loading || undefined">
    <table class="table">
      <thead>
        <tr>
          <th scope="col">{{ t('admin.mpay.cols.order') }}</th>
          <th scope="col">{{ t('admin.mpay.cols.customer') }}</th>
          <th scope="col">{{ t('admin.mpay.cols.service') }}</th>
          <th scope="col">{{ t('admin.mpay.cols.method') }}</th>
          <th scope="col">{{ t('admin.mpay.cols.amount') }}</th>
          <th scope="col">{{ t('admin.mpay.cols.date') }}</th>
          <th scope="col">{{ t('admin.mpay.cols.status') }}</th>
          <th scope="col"><span class="visually-hidden">{{ t('admin.mpay.cols.actions') }}</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.id" :class="{ pending: r.status === 'pending_review' }">
          <td><span class="ltr strong">{{ r.orderNumber }}</span></td>
          <td>{{ r.customer.name }}</td>
          <td class="service">{{ f.text(r.serviceTitle) }}</td>
          <td><span class="method"><PaymentsPaymentMethodLogo :method="r.method" size="sm" />{{ t(`mpay.methods.${r.method}.label`) }}</span></td>
          <td class="strong">{{ f.money(r.amountMinor) }}</td>
          <td>{{ f.dateTime(r.submittedAt) }}</td>
          <td><PaymentsPaymentVerificationBadge :status="r.status" :demo="r.demo" /></td>
          <td>
            <UiButton :variant="r.status === 'pending_review' ? 'primary' : 'secondary'" size="sm" @click="emit('review', r.id)">
              {{ r.status === 'pending_review' ? t('admin.mpay.review') : t('admin.mpay.details') }}
            </UiButton>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="8" class="empty">{{ loading ? t('common.loading') : t('admin.mpay.empty') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-card { padding: 0; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 980px; font-size: 14px; }
.table th { background: var(--neutral-100); text-align: start; color: var(--text-muted); font-weight: 600; padding: 10px 14px; white-space: nowrap; }
.table td { padding: 10px 14px; border-top: 1px solid var(--border-subtle); vertical-align: middle; }
tr.pending td { background: #fffdf8; }
.strong { color: var(--text-strong); font-weight: 700; white-space: nowrap; }
.service { max-width: 220px; }
.method { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
.empty { text-align: center; color: var(--text-muted); padding: 32px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
