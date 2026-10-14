import type { ApiErrorData } from '#shared/domain/errors'

export interface ApiFailure {
  code: string
  message: string
  fieldErrors?: ApiErrorData['fieldErrors']
}

/**
 * Thin wrapper over $fetch for mutations. Errors are normalized to
 * { code, message } with a translated message (errors.<code>).
 */
export function useApi() {
  const { t, te } = useI18n()

  function toFailure(err: unknown): ApiFailure {
    // Errors thrown by `call()` are already normalized.
    if (isApiFailure(err)) return err
    const data = (err as { data?: { data?: ApiErrorData } })?.data?.data
    const status = (err as { statusCode?: number })?.statusCode
    const code = data?.code ?? (status === 401 ? 'OQ401' : status === 403 ? 'OQ403' : 'OQ500')
    const key = `errors.${code}`
    return {
      code,
      message: te(key) ? t(key) : t('errors.generic'),
      fieldErrors: data?.fieldErrors,
    }
  }

  async function call<T>(url: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    try {
      return await $fetch<T>(url, options as never) as T
    }
    catch (err) {
      throw toFailure(err)
    }
  }

  return { call, toFailure }
}

export function isApiFailure(e: unknown): e is ApiFailure {
  return !!e && typeof e === 'object' && 'code' in e && 'message' in e
}
