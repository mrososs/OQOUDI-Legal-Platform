import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LOADING_FAILSAFE_MS,
  LOADING_HIDE_GRACE_MS,
  LOADING_MIN_VISIBLE_MS,
  LOADING_SHOW_DELAY_MS,
  classifyRequest,
  createLoadingTracker,
  type LoadingState,
} from '#shared/domain/loading'

const ORIGIN = 'https://oqoudi.test'
const SUPABASE = 'https://abc.supabase.co'
const classify = (url: string, method = 'GET', silent = false) => classifyRequest({ url, method, origin: ORIGIN, silent })

describe('classifyRequest', () => {
  it('treats our own /api routes as reads or writes by method', () => {
    expect(classify('/api/campaign')).toBe('read')
    expect(classify(`${ORIGIN}/api/campaign`)).toBe('read')
    expect(classify('/api/orders', 'POST')).toBe('mutation')
    expect(classify('/api/orders/1', 'patch')).toBe('mutation')
    expect(classify('/api/orders/1', 'DELETE')).toBe('mutation')
  })

  it('classifies Supabase REST, auth and functions calls by method', () => {
    expect(classify(`${SUPABASE}/rest/v1/services?select=*`)).toBe('read')
    expect(classify(`${SUPABASE}/rest/v1/notifications?id=eq.1`, 'PATCH')).toBe('mutation')
    expect(classify(`${SUPABASE}/auth/v1/token?grant_type=password`, 'POST')).toBe('mutation')
    expect(classify(`${SUPABASE}/auth/v1/logout`, 'POST')).toBe('mutation')
    expect(classify(`${SUPABASE}/functions/v1/anything`, 'POST')).toBe('mutation')
  })

  it('treats PostgREST rpc POSTs and storage transfers as non-blocking reads', () => {
    expect(classify(`${SUPABASE}/rest/v1/rpc/dashboard_kpis`, 'POST')).toBe('read')
    expect(classify(`${SUPABASE}/storage/v1/object/upload/sign/order-documents/x`, 'PUT')).toBe('read')
    expect(classify(`${SUPABASE}/storage/v1/object/sign/order-documents/x`, 'POST')).toBe('read')
  })

  it('ignores background noise and unrelated traffic', () => {
    expect(classify(`${SUPABASE}/rest/v1/notifications?select=id`, 'HEAD')).toBeNull()
    expect(classify(`${SUPABASE}/auth/v1/token?grant_type=refresh_token`, 'POST')).toBeNull()
    expect(classify('/_nuxt/entry.js')).toBeNull()
    expect(classify('/_payload.json')).toBeNull()
    expect(classify('https://fonts.googleapis.com/css2?family=Cairo')).toBeNull()
    expect(classify('https://elsewhere.test/api/orders', 'POST')).toBeNull()
    expect(classify('http://[bad')).toBeNull()
  })

  it('honours the silent opt-out', () => {
    expect(classify('/api/campaign', 'GET', true)).toBeNull()
    expect(classify('/api/orders', 'POST', true)).toBeNull()
  })
})

describe('createLoadingTracker', () => {
  let states: LoadingState[]
  let tracker: ReturnType<typeof createLoadingTracker>
  const last = () => states.at(-1)

  beforeEach(() => {
    vi.useFakeTimers()
    states = []
    tracker = createLoadingTracker(s => states.push(s))
  })
  afterEach(() => {
    tracker.reset()
    vi.useRealTimers()
  })

  it('never shows for work that finishes inside the delay', () => {
    const end = tracker.begin('route')
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS - 1)
    end()
    vi.advanceTimersByTime(5_000)
    expect(states).toEqual([])
  })

  it('shows after the delay as an overlay for routes and writes', () => {
    tracker.begin('route')
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS)
    expect(last()).toEqual({ visible: true, overlay: true, blocking: false })
  })

  it('blocks clicks only while a write is pending', () => {
    tracker.begin('route')
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS)
    const endWrite = tracker.begin('mutation')
    expect(last()).toEqual({ visible: true, overlay: true, blocking: true })
    endWrite()
    expect(last()).toEqual({ visible: true, overlay: true, blocking: false })
  })

  it('shows plain reads as a compact pill, not an overlay', () => {
    tracker.begin('read')
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS)
    expect(last()).toEqual({ visible: true, overlay: false, blocking: false })
  })

  it('stays visible for the minimum time, then hides', () => {
    const end = tracker.begin('mutation')
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS)
    vi.advanceTimersByTime(50)
    end()
    // Nothing pending any more, so clicks are free immediately, but the loader lingers.
    expect(last()).toEqual({ visible: true, overlay: true, blocking: false })
    vi.advanceTimersByTime(LOADING_MIN_VISIBLE_MS - 50 - 1)
    expect(last()?.visible).toBe(true)
    vi.advanceTimersByTime(1)
    expect(last()).toEqual({ visible: false, overlay: false, blocking: false })
  })

  it('hides only after the grace once the minimum time already elapsed', () => {
    const end = tracker.begin('route')
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS + LOADING_MIN_VISIBLE_MS + 100)
    end()
    expect(last()?.visible).toBe(true)
    vi.advanceTimersByTime(LOADING_HIDE_GRACE_MS)
    expect(last()?.visible).toBe(false)
  })

  it('bridges back-to-back calls without hiding in between', () => {
    const first = tracker.begin('mutation')
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS + LOADING_MIN_VISIBLE_MS + 100)
    first()
    // The next call of the chain starts inside the grace window.
    vi.advanceTimersByTime(LOADING_HIDE_GRACE_MS - 1)
    const second = tracker.begin('mutation')
    vi.advanceTimersByTime(5_000)
    expect(last()).toEqual({ visible: true, overlay: true, blocking: true })
    second()
    vi.advanceTimersByTime(LOADING_HIDE_GRACE_MS)
    expect(last()?.visible).toBe(false)
    // The only hidden state in the whole chain is the final one: no hide/show flicker in between.
    expect(states.filter(s => !s.visible)).toHaveLength(1)
    expect(states.at(-1)?.visible).toBe(false)
  })

  it('counts every pending item and ignores a double end', () => {
    const a = tracker.begin('read')
    const b = tracker.begin('read')
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS + LOADING_MIN_VISIBLE_MS)
    a()
    a()
    expect(last()?.visible).toBe(true)
    b()
    vi.advanceTimersByTime(LOADING_HIDE_GRACE_MS)
    expect(last()?.visible).toBe(false)
  })

  it('gives up on work that never ends (failsafe)', () => {
    tracker.begin('mutation')
    vi.advanceTimersByTime(LOADING_FAILSAFE_MS)
    vi.advanceTimersByTime(LOADING_MIN_VISIBLE_MS)
    expect(last()).toEqual({ visible: false, overlay: false, blocking: false })
  })

  it('reset clears everything immediately', () => {
    tracker.begin('mutation')
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS)
    tracker.reset()
    expect(last()?.visible).toBe(false)
    vi.advanceTimersByTime(LOADING_FAILSAFE_MS)
    expect(states.filter(s => s.visible)).toHaveLength(1)
  })
})
