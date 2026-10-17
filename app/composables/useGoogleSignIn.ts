import { safeRedirectPath } from '#shared/domain/postAuth'

/**
 * Starts the official Supabase Google OAuth (PKCE) flow. Used from both the
 * login and register pages — a Google account works from either.
 *
 * The browser is redirected to Google and returns to `/auth/callback`, where
 * supabase-js exchanges the code automatically; nothing here exchanges it.
 */
export function useGoogleSignIn() {
  const supabase = useSupabaseClient()
  const localePath = useLocalePath()
  const { t } = useI18n()

  const busy = shallowRef(false)
  const error = shallowRef('')

  // Back button from Google restores this page from the bfcache with the
  // button still "busy" — put it back.
  function onPageShow(event: PageTransitionEvent) {
    if (event.persisted) busy.value = false
  }
  onMounted(() => window.addEventListener('pageshow', onPageShow))
  onBeforeUnmount(() => window.removeEventListener('pageshow', onPageShow))

  async function start(redirect?: unknown) {
    if (busy.value) return
    error.value = ''
    busy.value = true
    rememberPostAuthRedirect(safeRedirectPath(redirect))

    // `redirectTo` must be the origin that holds the PKCE verifier cookie, i.e.
    // the current one — never a configured constant, never hard-coded localhost.
    const { error: failure } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${localePath('/auth/callback')}`,
        // Always show Google's account chooser, even with a single signed-in account.
        queryParams: { prompt: 'select_account' },
      },
    })
    if (failure) {
      busy.value = false
      error.value = t('auth.googleError')
    }
    // On success the browser is already navigating to Google; keep `busy` on.
  }

  return { busy, error, start }
}
