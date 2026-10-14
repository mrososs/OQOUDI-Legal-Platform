export interface Toast {
  id: number
  message: string
  tone: 'default' | 'critical'
}

let seq = 0

/** App-wide toast queue (2.6 s, as in the prototype). */
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function show(message: string, tone: Toast['tone'] = 'default') {
    const id = ++seq
    toasts.value = [...toasts.value, { id, message, tone }]
    if (import.meta.client) setTimeout(() => dismiss(id), 2600)
  }

  return {
    toasts: readonly(toasts),
    show,
    error: (message: string) => show(message, 'critical'),
    dismiss,
  }
}
