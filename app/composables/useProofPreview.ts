/**
 * Loads a short-lived (60 s) signed URL for a payment proof. Access is
 * decided server-side (RLS: the order's customers and admins only).
 */
export function useProofPreview() {
  const { call, toFailure } = useApi()
  const toast = useToast()
  const url = shallowRef<string | null>(null)
  const loading = shallowRef(false)

  async function load(submissionId: string) {
    loading.value = true
    url.value = null
    try {
      const res = await call<{ url: string, expiresIn: number }>(`/api/payments/manual/${submissionId}/proof`)
      url.value = res.url
      return res.url
    }
    catch (err) {
      toast.error(toFailure(err).message)
      return null
    }
    finally {
      loading.value = false
    }
  }

  function clear() {
    url.value = null
  }

  return { url, loading, load, clear }
}
