import {
  checkProofFile,
  sanitizeProofName,
  type ManualMethod,
  type ManualPaymentConfig,
  type ProofProblem,
} from '#shared/domain/manualPayments'

interface SignedProofUpload {
  path: string
  signedUrl: string
  contentType: string
}

export interface SubmittedPayment {
  submissionId: string
  paymentId: string
  orderNumber: string
  amountMinor: number
  status: 'pending_review'
}

/**
 * Manual checkout state for one order: method choice, proof file, direct
 * upload to the private bucket (with progress) and submission for review.
 * The amount is never sent — the server takes it from the order.
 */
export function useManualCheckout(orderId: MaybeRefOrGetter<string | null | undefined>) {
  const { t } = useI18n()
  const { call, toFailure } = useApi()
  const toast = useToast()
  const supabaseKey = useRuntimeConfig().public.supabase.key as string

  const config = useAsyncData('payments:manual-config', () => $fetch<ManualPaymentConfig>('/api/payments/manual/config'), {
    server: false,
    lazy: true,
  })

  const method = shallowRef<ManualMethod | null>(null)
  const file = shallowRef<File | null>(null)
  const fileError = shallowRef('')
  const progress = shallowRef(0)
  const phase = shallowRef<'idle' | 'uploading' | 'submitting'>('idle')
  const submitError = shallowRef('')

  const methodConfig = computed(() => config.data.value?.methods.find(m => m.id === method.value) ?? null)
  const busy = computed(() => phase.value !== 'idle')
  const canSubmit = computed(() => !!methodConfig.value?.available && !!file.value && !fileError.value && !busy.value)

  function problemMessage(problem: ProofProblem) {
    return t(`mpay.proof.errors.${problem}`)
  }

  /** Validates and stores the chosen file. Inline error + warning toast for size. */
  function setFile(next: File | null) {
    submitError.value = ''
    if (!next) {
      file.value = null
      fileError.value = ''
      progress.value = 0
      return
    }
    const problem = checkProofFile(next)
    if (problem) {
      file.value = null
      fileError.value = problemMessage(problem)
      if (problem === 'size') toast.warning(fileError.value)
      else toast.error(fileError.value)
      return
    }
    fileError.value = ''
    progress.value = 0
    file.value = next
  }

  /** PUT straight to Supabase Storage with XHR so we can report progress. */
  function putWithProgress(signed: SignedProofUpload, body: File) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', signed.signedUrl)
      xhr.setRequestHeader('content-type', signed.contentType)
      xhr.setRequestHeader('x-upsert', 'false')
      xhr.setRequestHeader('cache-control', 'max-age=3600')
      if (supabaseKey) xhr.setRequestHeader('apikey', supabaseKey)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) progress.value = Math.min(99, Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload ${xhr.status}`)))
      xhr.onerror = () => reject(new Error('network'))
      xhr.send(body)
    })
  }

  async function submit(): Promise<SubmittedPayment | null> {
    const id = toValue(orderId)
    if (!id || !method.value || !file.value) {
      if (!file.value) fileError.value = t('mpay.proof.errors.required')
      return null
    }
    submitError.value = ''
    const proof = file.value
    try {
      phase.value = 'uploading'
      progress.value = 0
      const signed = await call<SignedProofUpload>(`/api/orders/${id}/payment-proof`, {
        method: 'POST',
        body: { fileName: sanitizeProofName(proof.name), sizeBytes: proof.size, mimeType: proof.type || undefined },
      })
      try {
        await putWithProgress(signed, proof)
      }
      catch {
        throw { code: 'OQ422_PROOF_UPLOAD', message: t('mpay.proof.errors.upload') }
      }
      progress.value = 100
      phase.value = 'submitting'
      const result = await call<SubmittedPayment>(`/api/orders/${id}/manual-payment`, {
        method: 'POST',
        body: { method: method.value, proofPath: signed.path },
      })
      toast.success(t('mpay.submitted'), { title: t('mpay.submittedTitle') })
      return result
    }
    catch (err) {
      const failure = toFailure(err)
      submitError.value = failure.message
      if (failure.code === 'OQ409_PAYMENT_PENDING_REVIEW') toast.warning(failure.message)
      else toast.error(failure.message, { important: true })
      return null
    }
    finally {
      phase.value = 'idle'
    }
  }

  return { config, method, methodConfig, file, fileError, progress, phase, busy, canSubmit, submitError, setFile, submit }
}
