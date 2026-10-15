import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { readonly, shallowRef } from 'vue'

// useToast relies on Nuxt auto-imports; provide them for the unit project.
vi.stubGlobal('shallowRef', shallowRef)
vi.stubGlobal('readonly', readonly)

type ToastModule = typeof import('../../app/composables/useToast')
let mod: ToastModule

beforeAll(async () => {
  mod = await import('../../app/composables/useToast')
})

afterEach(() => {
  mod.useToast().dismissAll()
  vi.useRealTimers()
})

describe('toast queue', () => {
  it('exposes success / error / warning / info and auto-dismisses', () => {
    vi.useFakeTimers()
    const toast = mod.useToast()
    const { toasts } = mod.useToastQueue()
    toast.success('saved')
    toast.info('copied')
    expect(toasts.value.map(t => t.type)).toEqual(['success', 'info'])
    vi.advanceTimersByTime(4000)
    expect(toasts.value).toHaveLength(0)
  })

  it('keeps important errors until dismissed', () => {
    vi.useFakeTimers()
    const toast = mod.useToast()
    const { toasts } = mod.useToastQueue()
    const id = toast.error('upload failed', { important: true })
    vi.advanceTimersByTime(60_000)
    expect(toasts.value).toHaveLength(1)
    toast.dismiss(id)
    expect(toasts.value).toHaveLength(0)
  })

  it('deduplicates the same message instead of stacking it', () => {
    const toast = mod.useToast()
    const { toasts } = mod.useToastQueue()
    const a = toast.warning('file too large')
    const b = toast.warning('file too large')
    expect(a).toBe(b)
    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]!.count).toBe(2)
  })

  it('caps the number of visible toasts', () => {
    const toast = mod.useToast()
    const { toasts } = mod.useToastQueue()
    for (let i = 0; i < 7; i++) toast.info(`message ${i}`)
    expect(toasts.value).toHaveLength(mod.MAX_VISIBLE_TOASTS)
    expect(toasts.value.at(-1)!.message).toBe('message 6')
  })

  it('promise() turns a loading toast into success or error in place', async () => {
    const toast = mod.useToast()
    const { toasts } = mod.useToastQueue()
    const ok = toast.promise(Promise.resolve(42), { loading: 'working', success: v => `done ${v}`, error: 'failed' })
    expect(toasts.value[0]).toMatchObject({ type: 'loading', message: 'working' })
    await expect(ok).resolves.toBe(42)
    expect(toasts.value[0]).toMatchObject({ type: 'success', message: 'done 42' })

    toast.dismissAll()
    const bad = toast.promise(Promise.reject(new Error('x')), { loading: 'working', success: 'ok', error: 'failed' })
    await expect(bad).rejects.toThrow('x')
    expect(toasts.value[0]).toMatchObject({ type: 'error', message: 'failed' })
  })
})
