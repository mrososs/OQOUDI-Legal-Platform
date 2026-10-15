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
// Hide gateway attempts that never reached a provider (superseded checkouts).
const visible = computed(() => rows.value.filter(p => p.provider === 'manual' || (p.status !== 'cancelled' && p.status !== 'initiated')))
const paid = computed(() => rows.value.filter(p => p.status === 'succeeded'))
const totalPaid = computed(() => paid.value.reduce((n, p) => n + p.amountMinor, 0))
const hasDemo = computed(() => rows.value.some(p => p.isDemo))
const underReview = computed(() => rows.value.filter(p => p.verification?.status === 'pending_review').length)

const proofFor = shallowRef<PaymentRow | null>(null)
const proofOpen = computed({
  get: () => !!proofFor.value,
  set: (v: boolean) => { if (!v) proofFor.value = null },
})

useSeoMeta({ title: () => t('account.payments.title'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <h1 class="h1">{{ t('account.payments.title') }}</h1>
    <PaymentsPaymentDemoNotice v-if="hasDemo" compact />
    <div class="totals">
      <div class="kh-card total">
        <span class="muted">{{ hasDemo ? t('account.payments.totalPaidDemo') : t('account.payments.totalPaid') }}</span>
        <strong class="amount">{{ f.money(totalPaid) }}</strong>
      </div>
      <div class="kh-card total">
        <span class="muted">{{ t('account.payments.underReview') }}</span>
        <strong class="amount">{{ f.number(underReview) }}</strong>
      </div>
    </div>
    <AccountPaymentsTable v-if="visible.length" :rows="visible" @view-proof="row => (proofFor = row)" />
    <UiEmptyState v-else :title="t('account.payments.empty')" />
    <p class="note">{{ t('account.payments.note') }}</p>
    <PaymentsProofPreviewModal v-model:open="proofOpen" :submission-id="proofFor?.verification?.submissionId ?? null" :demo="proofFor?.isDemo" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }
.h1 { font-size: clamp(24px, 3vw, 32px); font-weight: 800; margin: 0; }
.totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 12px; }
.total { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 18px 22px; }
.amount { font-size: 22px; color: var(--text-strong); }
.note { margin: 0; font-size: 12px; color: var(--text-muted); }
</style>
