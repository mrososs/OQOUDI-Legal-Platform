import { createLoadingTracker, type LoadingKind, type LoadingState } from '#shared/domain/loading'

/*
 * Client-only module state (same reasoning as useToast): the loader must never be serialized into the
 * SSR payload, and nothing registers work on the server, so one request can't leak a loader into another.
 * Navigation and network calls are wired in plugins/loading.client.ts; use `track` for anything else.
 */
const state = shallowRef<LoadingState>({ visible: false, overlay: false, blocking: false })
const tracker = createLoadingTracker((next) => {
  state.value = next
})

let endRoute: (() => void) | undefined

const noop = () => {}

export function useGlobalLoading() {
  const begin = (kind: LoadingKind) => (import.meta.client ? tracker.begin(kind) : noop)

  /** Nuxt can fire `page:loading:start` repeatedly before one `end`: keep a single slot for the route. */
  function startRoute() {
    const previous = endRoute
    endRoute = begin('route')
    previous?.()
  }

  function finishRoute() {
    endRoute?.()
    endRoute = undefined
  }

  /** Runs `task` with the branded loader showing (after the usual short delay). */
  async function track<T>(kind: LoadingKind, task: () => Promise<T>): Promise<T> {
    const end = begin(kind)
    try {
      return await task()
    }
    finally {
      end()
    }
  }

  return { state: readonly(state), begin, startRoute, finishRoute, track }
}
