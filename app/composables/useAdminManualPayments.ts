import { isManualMethod, VERIFICATION_STATUSES, type ManualMethod, type VerificationStatus } from '#shared/domain/manualPayments'
import type { Localized } from '#shared/domain/localized'

export interface AdminSubmission {
  id: string
  orderId: string
  orderNumber: string
  orderStatus: string
  orderPaymentStatus: string
  orderTotalMinor: number
  serviceTitle: Localized | null
  serviceKind: string | null
  method: ManualMethod
  amountMinor: number
  currency: string
  status: VerificationStatus
  demo: boolean
  submittedAt: string
  reviewedAt: string | null
  reviewerName: string | null
  rejectionReason: string | null
  proofMime: string
  proofSizeBytes: number
  customer: { name: string, email: string, phone: string | null }
}

export interface AdminKpis {
  pending: number
  approved: number
  rejected: number
  pendingAmountMinor: number
  approvedDemoAmountMinor: number
  approvedRealAmountMinor: number
}

interface ListResponse { rows: AdminSubmission[], total: number, page: number, pageSize: number, kpis: AdminKpis }

export type SortKey = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc'
const SORTS: Record<SortKey, { sort: 'submitted_at' | 'amount', dir: 'asc' | 'desc' }> = {
  newest: { sort: 'submitted_at', dir: 'desc' },
  oldest: { sort: 'submitted_at', dir: 'asc' },
  amount_desc: { sort: 'amount', dir: 'desc' },
  amount_asc: { sort: 'amount', dir: 'asc' },
}
const PAGE_SIZE = 10
const EMPTY_KPIS: AdminKpis = { pending: 0, approved: 0, rejected: 0, pendingAmountMinor: 0, approvedDemoAmountMinor: 0, approvedRealAmountMinor: 0 }

/**
 * Admin manual payment verification: URL-driven filters (shareable, back
 * button friendly), server-side list, review panel selection (?review=id,
 * also used by notification deep links) and approve/reject actions.
 */
export function useAdminManualPayments() {
  const route = useRoute()
  const router = useRouter()
  const requestFetch = useRequestFetch()
  const { t } = useI18n()
  const { call, toFailure } = useApi()
  const toast = useToast()

  const status = computed<VerificationStatus | null>(() => {
    const v = String(route.query.status ?? '')
    return (VERIFICATION_STATUSES as readonly string[]).includes(v) ? v as VerificationStatus : null
  })
  const method = computed<ManualMethod | null>(() => (isManualMethod(route.query.method) ? route.query.method : null))
  const q = computed(() => (typeof route.query.q === 'string' ? route.query.q.slice(0, 80) : ''))
  const sortKey = computed<SortKey>(() => (String(route.query.sort) in SORTS ? route.query.sort as SortKey : 'newest'))
  const page = computed(() => Math.max(1, Number.parseInt(String(route.query.page ?? '1'), 10) || 1))
  const reviewId = computed(() => (typeof route.query.review === 'string' ? route.query.review : null))

  const list = useAsyncData(
    'admin:manual-payments',
    () => requestFetch<ListResponse>('/api/admin/manual-payments', {
      query: {
        status: status.value ?? undefined,
        method: method.value ?? undefined,
        q: q.value || undefined,
        page: page.value,
        pageSize: PAGE_SIZE,
        ...SORTS[sortKey.value],
      },
    }),
    { watch: [status, method, q, sortKey, page] },
  )

  const rows = computed(() => list.data.value?.rows ?? [])
  const total = computed(() => list.data.value?.total ?? 0)
  const kpis = computed(() => list.data.value?.kpis ?? EMPTY_KPIS)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

  // The selected submission: from the current page, or fetched (deep link).
  const detail = useAsyncData(
    'admin:manual-payment',
    async () => {
      const id = reviewId.value
      if (!id) return null
      return rows.value.find(r => r.id === id) ?? await requestFetch<AdminSubmission>(`/api/admin/manual-payments/${id}`).catch(() => null)
    },
    { watch: [reviewId] },
  )
  const selected = computed(() => detail.data.value ?? null)

  function setQuery(patch: Record<string, string | number | null | undefined>, resetPage = true) {
    const next: Record<string, string> = {}
    for (const [k, v] of Object.entries({ ...route.query, ...(resetPage ? { page: undefined } : {}), ...patch })) {
      if (v !== null && v !== undefined && v !== '' && !(k === 'page' && String(v) === '1')) next[k] = String(v)
    }
    return router.replace({ query: next })
  }

  const openReview = (id: string) => setQuery({ review: id }, false)
  const closeReview = () => setQuery({ review: null }, false)

  const acting = shallowRef<'approve' | 'reject' | null>(null)

  async function afterDecision() {
    await list.refresh()
    await Promise.all([detail.refresh(), refreshNuxtData(['badge:dashboard'])])
  }

  async function approve(sub: AdminSubmission) {
    acting.value = 'approve'
    try {
      await toast.promise(
        call(`/api/admin/manual-payments/${sub.id}/approve`, { method: 'POST', body: { orderId: sub.orderId } }),
        { loading: t('admin.mpay.approving'), success: t('admin.mpay.approved'), error: err => toFailure(err).message },
        { important: true },
      )
      await afterDecision()
      return true
    }
    catch {
      await afterDecision()
      return false
    }
    finally {
      acting.value = null
    }
  }

  async function reject(sub: AdminSubmission, reason: string) {
    acting.value = 'reject'
    try {
      await toast.promise(
        call(`/api/admin/manual-payments/${sub.id}/reject`, { method: 'POST', body: { orderId: sub.orderId, reason: reason.trim() || undefined } }),
        { loading: t('admin.mpay.rejecting'), success: t('admin.mpay.rejected'), error: err => toFailure(err).message },
        { important: true },
      )
      await afterDecision()
      return true
    }
    catch {
      await afterDecision()
      return false
    }
    finally {
      acting.value = null
    }
  }

  return {
    status, method, q, sortKey, page, pageCount, reviewId,
    list, rows, total, kpis, selected, detail, acting,
    setQuery, openReview, closeReview, approve, reject,
  }
}
