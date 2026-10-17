import { validateOnboarding, type OnboardingField, type OnboardingFieldErrors, type OnboardingAccountKind } from '#shared/domain/onboarding'

interface ProviderMetadata {
  full_name?: string
  name?: string
}

/**
 * State and submit logic of the first-time onboarding form.
 *
 * Prefill comes from what Google (or a previous partial signup) already gave
 * us; the email is only ever *displayed* — the server derives the identity
 * from the verified session and never accepts one from the browser.
 */
export function useCompleteProfile() {
  const { t, te, locale } = useI18n()
  const user = useSupabaseUser()
  const session = useSessionStore()
  const route = useRoute()
  const { call, toFailure } = useApi()
  const { settle } = usePostAuth()

  const email = computed(() => session.profile?.email ?? (user.value?.email as string | undefined) ?? '')

  function prefilledName(): string {
    const meta = (user.value?.user_metadata ?? {}) as ProviderMetadata
    const fromProvider = (meta.full_name ?? meta.name ?? '').trim()
    if (fromProvider) return fromProvider
    // The signup trigger falls back to the email's local part; don't offer that as a "name".
    const stored = session.profile?.fullName ?? ''
    return stored && stored !== email.value.split('@')[0] ? stored : ''
  }

  const form = reactive({
    fullName: prefilledName(),
    phone: session.profile?.phone ?? '',
    accountKind: (session.account?.kind ?? 'individual') as OnboardingAccountKind,
    companyName: session.account?.kind === 'company' ? session.account.displayName : '',
  })
  const errors = reactive<Partial<Record<OnboardingField, string>>>({})
  const failure = shallowRef('')
  const busy = shallowRef(false)

  function describe(code: string, params?: Record<string, number | string>): string {
    const key = `formErrors.${code}`
    return te(key) ? t(key, params ?? {}) : t('formErrors.invalidValue')
  }

  function applyErrors(fieldErrors: OnboardingFieldErrors | undefined) {
    for (const field of ['fullName', 'phone', 'accountKind', 'companyName'] as const) {
      const e = fieldErrors?.[field]
      errors[field] = e ? describe(e.code, e.params) : undefined
    }
  }

  async function submit() {
    if (busy.value) return
    failure.value = ''
    const checked = validateOnboarding({ ...form, locale: locale.value })
    applyErrors(checked.ok ? undefined : checked.errors)
    if (!checked.ok) return

    busy.value = true
    try {
      await call('/api/account/complete-profile', { method: 'POST', body: checked.value })
      const id = user.value?.sub
      if (!id) throw new Error('session lost')
      // Force a database re-read so no stale Pinia state sends the user back here.
      await navigateTo(await settle(id, route.query.redirect), { replace: true })
    }
    catch (e) {
      const f = toFailure(e)
      if (f.code === 'OQ422_VALIDATION' && f.fieldErrors) applyErrors(f.fieldErrors as OnboardingFieldErrors)
      else failure.value = f.code === 'OQ500' || f.code === 'OQ401' ? t('onboarding.failed') : f.message
    }
    finally {
      busy.value = false
    }
  }

  return { form, errors, failure, busy, email, submit }
}
