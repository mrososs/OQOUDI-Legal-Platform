<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { fetchCustomerPayments, type PaymentRow } from '~/repositories/account'

definePageMeta({ layout: 'client', middleware: ['auth'] })

const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const session = useSessionStore()

const { data: rows } = await useAsyncData(
  'account:payments',
  () => (session.account ? fetchCustomerPayments(supabase, session.account.id) : Promise.resolve([] as PaymentRow[])),
  { default: () => [] as PaymentRow[], watch: [() => session.account?.id] },
)
// Hide attempts that never reached the provider (superseded checkouts).
const visible = computed(() => rows.value.filter(p => p.status !== 'cancelled' && p.status !== 'initiated'))
const totalPaid = computed(() => rows.value.filter(p => p.status === 'succeeded').reduce((n, p) => n + p.amountMinor, 0))

useSeoMeta({ title: () => t('account.payments.title'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <h1 class="h1">{{ t('account.payments.title') }}</h1>
    <div class="kh-card total">
      <span class="muted">{{ t('account.payments.totalPaid') }}</span>
      <strong class="amount">{{ f.money(totalPaid) }}</strong>
    </div>
    <AccountPaymentsTable v-if="visible.length" :rows="visible" />
    <UiEmptyState v-else :title="t('account.payments.empty')" />
    <p class="note">{{ t('account.payments.note') }}</p>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }
.h1 { font-size: clamp(24px, 3vw, 32px); font-weight: 800; margin: 0; }
.total { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 18px 22px; }
.amount { font-size: 22px; color: var(--text-strong); }
.note { margin: 0; font-size: 12px; color: var(--text-muted); }
</style>
