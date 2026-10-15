export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  title?: string
  /** Milliseconds; 0 keeps the toast until dismissed. Defaults per type. */
  duration?: number
  /** Keep an error on screen until the user dismisses it. */
  important?: boolean
  action?: ToastAction
}

export interface ToastItem {
  id: number
  type: ToastType
  message: string
  title?: string
  duration: number
  action?: ToastAction
  /** How many times the same message was raised while visible. */
  count: number
  /** Bumped whenever the toast is refreshed, to restart its timer/progress. */
  version: number
}

export interface PromiseMessages<T> {
  loading: string
  success: string | ((value: T) => string)
  error: string | ((err: unknown) => string)
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3500,
  info: 3500,
  warning: 5000,
  error: 6500,
  loading: 0,
}
export const MAX_VISIBLE_TOASTS = 4

/*
 * Client-only module state. Toasts carry callbacks (actions), so they must
 * never be serialized into the SSR payload, and server-side calls are no-ops
 * (module state on the server would leak between requests).
 */
const items = shallowRef<ToastItem[]>([])
const timers = new Map<number, { handle: ReturnType<typeof setTimeout> | null, remaining: number, startedAt: number }>()
let seq = 0

function clearTimer(id: number) {
  const t = timers.get(id)
  if (t?.handle) clearTimeout(t.handle)
  timers.delete(id)
}

function dismiss(id: number) {
  clearTimer(id)
  items.value = items.value.filter(t => t.id !== id)
}

function schedule(id: number, duration: number) {
  clearTimer(id)
  if (!duration) return
  timers.set(id, { handle: setTimeout(() => dismiss(id), duration), remaining: duration, startedAt: Date.now() })
}

function pause(id: number) {
  const t = timers.get(id)
  if (!t?.handle) return
  clearTimeout(t.handle)
  t.handle = null
  t.remaining = Math.max(0, t.remaining - (Date.now() - t.startedAt))
}

function resume(id: number) {
  const t = timers.get(id)
  if (!t || t.handle) return
  t.startedAt = Date.now()
  t.handle = setTimeout(() => dismiss(id), t.remaining)
}

function durationFor(type: ToastType, opts: ToastOptions): number {
  if (type === 'error' && opts.important) return 0
  return opts.duration ?? DEFAULT_DURATION[type]
}

function push(type: ToastType, message: string, opts: ToastOptions = {}): number {
  if (import.meta.server || !message) return -1
  const duration = durationFor(type, opts)

  // Deduplicate: the same message already on screen is refreshed, not stacked.
  const existing = items.value.find(t => t.type === type && t.message === message && t.title === opts.title)
  if (existing) {
    items.value = items.value.map(t => (t.id === existing.id ? { ...t, count: t.count + 1, version: t.version + 1, duration } : t))
    schedule(existing.id, duration)
    return existing.id
  }

  const id = ++seq
  let next = [...items.value, { id, type, message, title: opts.title, duration, action: opts.action, count: 1, version: 0 }]
  // Keep at most N visible: drop the oldest non-persistent toast first.
  while (next.length > MAX_VISIBLE_TOASTS) {
    const victim = next.find(t => t.duration > 0) ?? next[0]!
    clearTimer(victim.id)
    next = next.filter(t => t.id !== victim.id)
  }
  items.value = next
  schedule(id, duration)
  return id
}

/** Turns an existing (e.g. loading) toast into another type in place. */
function update(id: number, type: ToastType, message: string, opts: ToastOptions = {}) {
  if (import.meta.server) return
  const duration = durationFor(type, opts)
  if (!items.value.some(t => t.id === id)) {
    push(type, message, opts)
    return
  }
  items.value = items.value.map(t => (t.id === id
    ? { ...t, type, message, title: opts.title, action: opts.action, duration, version: t.version + 1 }
    : t))
  schedule(id, duration)
}

async function promise<T>(work: Promise<T> | (() => Promise<T>), messages: PromiseMessages<T>, opts: ToastOptions = {}): Promise<T> {
  const id = push('loading', messages.loading, { title: opts.title })
  try {
    const value = await (typeof work === 'function' ? work() : work)
    update(id, 'success', typeof messages.success === 'function' ? messages.success(value) : messages.success)
    return value
  }
  catch (err) {
    update(id, 'error', typeof messages.error === 'function' ? messages.error(err) : messages.error, { important: opts.important })
    throw err
  }
}

const api = {
  success: (message: string, opts?: ToastOptions) => push('success', message, opts),
  error: (message: string, opts?: ToastOptions) => push('error', message, opts),
  warning: (message: string, opts?: ToastOptions) => push('warning', message, opts),
  info: (message: string, opts?: ToastOptions) => push('info', message, opts),
  loading: (message: string, opts?: ToastOptions) => push('loading', message, opts),
  promise,
  update,
  dismiss,
  dismissAll: () => {
    for (const t of items.value) clearTimer(t.id)
    items.value = []
  },
  /** @deprecated use success()/info() */
  show: (message: string) => push('success', message),
}

export type ToastApi = typeof api

/**
 * Global toast API: `toast.success() / error() / warning() / info() /
 * promise()`. Use for feedback on actions — never instead of inline field
 * validation, and not for routine data loading.
 */
export function useToast() {
  return api
}

/** Internal: state + timer controls for <UiToaster>. */
export function useToastQueue() {
  return { toasts: readonly(items), dismiss, pause, resume }
}
