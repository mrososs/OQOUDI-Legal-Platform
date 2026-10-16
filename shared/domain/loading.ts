/**
 * Global loading indicator — pure logic, no Vue and no DOM, so it is unit-tested with fake timers.
 *
 * Work registers itself while it is pending (`begin`). The indicator only becomes visible after
 * LOADING_SHOW_DELAY_MS, so fast navigations and requests never flash a loader, and once visible it
 * stays for at least LOADING_MIN_VISIBLE_MS, so work that ends just after the delay doesn't blink.
 */

/** `route`: a page navigation. `mutation`: a write. `read`: a background-safe read. */
export type LoadingKind = 'route' | 'mutation' | 'read'

export interface LoadingState {
  visible: boolean
  /** Full-screen branded loader (navigation or a write); otherwise a compact click-through pill. */
  overlay: boolean
  /** The page behind must not receive clicks: a write is in flight. */
  blocking: boolean
}

export const LOADING_SHOW_DELAY_MS = 250
export const LOADING_MIN_VISIBLE_MS = 450
/** After the last pending item ends, wait this long so sequential calls (sign → upload → complete) don't blink. */
export const LOADING_HIDE_GRACE_MS = 150
/** A hung request or a lost hook must never trap the user behind the loader. */
export const LOADING_FAILSAFE_MS = 30_000

/** Request header that opts a same-origin call out of the loader (periodic/background refreshes). */
export const SILENT_HEADER = 'x-oq-silent'

const SUPABASE_PATH = /^\/(rest|auth|storage|functions)\/v1\//

export interface RequestInfo {
  url: string
  method: string
  /** The page origin, used to resolve relative URLs and to recognise our own `/api` routes. */
  origin: string
  silent?: boolean
}

/**
 * Decides whether a network call drives the loader, and how:
 *  - our own `/api/**` routes and Supabase REST/auth/functions calls: writes are `mutation`, reads are `read`;
 *  - PostgREST `rpc/*` calls are POSTs but read-only here (writes go through `/api`), so they are `read`;
 *  - storage transfers are `read`: uploads render their own progress and must not be covered by a veil;
 *  - HEAD (badge counters) and the automatic session refresh are background noise → ignored.
 */
export function classifyRequest({ url, method, origin, silent }: RequestInfo): LoadingKind | null {
  if (silent) return null
  let u: URL
  try {
    u = new URL(url, origin)
  }
  catch {
    return null
  }
  const verb = method.toUpperCase()
  if (verb === 'HEAD') return null
  const isRead = verb === 'GET'

  if (u.origin === origin && u.pathname.startsWith('/api/')) return isRead ? 'read' : 'mutation'

  if (!SUPABASE_PATH.test(u.pathname)) return null
  if (u.pathname.startsWith('/auth/v1/token') && u.searchParams.get('grant_type') === 'refresh_token') return null
  if (u.pathname.startsWith('/storage/v1/') || u.pathname.startsWith('/rest/v1/rpc/')) return 'read'
  return isRead ? 'read' : 'mutation'
}

const HIDDEN: LoadingState = { visible: false, overlay: false, blocking: false }

export function createLoadingTracker(onChange: (state: LoadingState) => void) {
  const pending = new Map<number, LoadingKind>()
  const failsafes = new Map<number, ReturnType<typeof setTimeout>>()
  let nextId = 0
  let visible = false
  let overlay = false
  let shownAt = 0
  let state = HIDDEN
  let showTimer: ReturnType<typeof setTimeout> | undefined
  let hideTimer: ReturnType<typeof setTimeout> | undefined

  function publish() {
    const kinds = [...pending.values()]
    // The mode sticks while the loader waits out its minimum time with nothing pending.
    if (kinds.length) overlay = kinds.some(k => k !== 'read')
    const next: LoadingState = visible
      ? { visible: true, overlay, blocking: kinds.includes('mutation') }
      : HIDDEN
    if (next.visible === state.visible && next.overlay === state.overlay && next.blocking === state.blocking) return
    state = next
    onChange(next)
  }

  function show() {
    showTimer = undefined
    if (!pending.size) return
    visible = true
    shownAt = Date.now()
    publish()
  }

  function hide() {
    hideTimer = undefined
    if (pending.size) return
    visible = false
    overlay = false
    publish()
  }

  function end(id: number) {
    if (!pending.delete(id)) return
    clearTimeout(failsafes.get(id))
    failsafes.delete(id)
    if (pending.size) return publish()
    if (!visible) {
      clearTimeout(showTimer)
      showTimer = undefined
      return
    }
    publish()
    const remaining = LOADING_MIN_VISIBLE_MS - (Date.now() - shownAt)
    hideTimer = setTimeout(hide, Math.max(remaining, LOADING_HIDE_GRACE_MS))
  }

  /** Marks `kind` work as pending. The returned function ends it and is safe to call more than once. */
  function begin(kind: LoadingKind): () => void {
    const id = nextId++
    pending.set(id, kind)
    failsafes.set(id, setTimeout(() => end(id), LOADING_FAILSAFE_MS))
    clearTimeout(hideTimer)
    hideTimer = undefined
    if (!visible && showTimer === undefined) showTimer = setTimeout(show, LOADING_SHOW_DELAY_MS)
    else publish()
    return () => end(id)
  }

  /** Drops everything immediately (fatal error screens, teardown). */
  function reset() {
    for (const t of failsafes.values()) clearTimeout(t)
    failsafes.clear()
    pending.clear()
    clearTimeout(showTimer)
    clearTimeout(hideTimer)
    showTimer = hideTimer = undefined
    visible = overlay = false
    publish()
  }

  return { begin, reset }
}
