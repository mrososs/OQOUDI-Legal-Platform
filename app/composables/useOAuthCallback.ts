/**
 * Landing logic for `/auth/callback` (Supabase OAuth, PKCE).
 *
 * The browser client created by @nuxtjs/supabase exchanges `?code=` itself
 * while it initialises (`detectSessionInUrl`), and the module's plugin awaits
 * that before any page mounts. So by the time this runs there is either a
 * session (success) or none (failure). Calling `exchangeCodeForSession` here
 * would be a second exchange of a one-time code and fail — don't.
 */
export type OAuthFailure = 'cancelled' | 'expired' | 'invalid' | 'emailNotVerified' | 'accountExists' | 'generic'

/** How long to wait for a session when the URL still carries a code. */
const SESSION_WAIT_MS = 6_000

const ACCOUNT_EXISTS = new Set(['email_exists', 'identity_already_exists', 'user_already_exists', 'email_conflict_identity_not_deletable'])
const EXPIRED = new Set(['flow_state_expired', 'flow_state_not_found', 'bad_oauth_state', 'bad_oauth_callback', 'bad_code_verifier', 'validation_failed'])

function classify(error: string, code: string): OAuthFailure {
  if (error === 'access_denied' || code === 'access_denied') return 'cancelled'
  if (code === 'provider_email_needs_verification') return 'emailNotVerified'
  if (ACCOUNT_EXISTS.has(code)) return 'accountExists'
  if (EXPIRED.has(code) || error === 'invalid_request' || error === 'invalid_grant') return 'expired'
  return 'generic'
}

/** Supabase reports errors in the query (PKCE) or the hash (implicit). */
function readError(): { error: string, code: string } | null {
  const merged = new URLSearchParams(window.location.search)
  for (const [k, v] of new URLSearchParams(window.location.hash.replace(/^#/, ''))) merged.set(k, v)
  const error = merged.get('error')
  const code = merged.get('error_code')
  return error || code ? { error: error ?? '', code: code ?? '' } : null
}

export function useOAuthCallback() {
  const user = useSupabaseUser()
  const { settle } = usePostAuth()

  const failure = shallowRef<OAuthFailure | null>(null)

  let finished = false
  let stopWatch: (() => void) | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  function cleanup() {
    stopWatch?.()
    stopWatch = undefined
    if (timer) clearTimeout(timer)
    timer = undefined
  }

  async function finish(userId: string) {
    if (finished) return
    finished = true
    cleanup()
    try {
      // Fresh roles/profile from the database, then the one shared decision:
      // staff → dashboard, incomplete customer → complete-profile, else home.
      const target = await settle(userId, takePostAuthRedirect())
      await navigateTo(target, { replace: true })
    }
    catch {
      finished = false
      failure.value = 'generic'
    }
  }

  /** Call from `onMounted` — the decision needs the browser's URL and session. */
  function run() {
    const reported = readError()
    if (reported) {
      failure.value = classify(reported.error, reported.code)
      return
    }
    if (user.value?.sub) {
      void finish(user.value.sub)
      return
    }
    // No session. A code still in the URL means the exchange is unfinished or
    // failed; give it a moment, otherwise this is not a valid callback.
    if (!new URLSearchParams(window.location.search).has('code')) {
      failure.value = 'invalid'
      return
    }
    stopWatch = watch(() => user.value?.sub, (id) => {
      if (id) void finish(id)
    })
    timer = setTimeout(() => {
      cleanup()
      failure.value = 'expired'
    }, SESSION_WAIT_MS)
  }

  onBeforeUnmount(cleanup)

  return { failure, run }
}
