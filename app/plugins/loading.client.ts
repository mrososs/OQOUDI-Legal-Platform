import { SILENT_HEADER, classifyRequest } from '#shared/domain/loading'

/**
 * Feeds the global logo loader (components/layout/GlobalLoading.vue):
 *  - routing: Nuxt's page loading hooks, the same ones <NuxtLoadingIndicator> uses;
 *  - endpoint calls: `fetch` is wrapped once, which covers `$fetch`/`useFetch` (ofetch resolves the
 *    global lazily) and every Supabase REST/auth/storage call (supabase-js and the module's retry
 *    wrapper also resolve it per call). What counts, and how, lives in classifyRequest().
 * A caller that must not trigger the loader sends the `x-oq-silent` header (same-origin calls only).
 */
export default defineNuxtPlugin({
  name: 'oq-loading',
  setup(nuxtApp) {
    const loading = useGlobalLoading()

    nuxtApp.hook('page:loading:start', loading.startRoute)
    nuxtApp.hook('page:loading:end', loading.finishRoute)
    nuxtApp.hook('vue:error', loading.finishRoute)

    const nativeFetch = window.fetch.bind(window)
    window.fetch = (input, init) => {
      let end: (() => void) | undefined
      try {
        const request = input instanceof Request ? input : null
        const kind = classifyRequest({
          url: request ? request.url : String(input),
          method: init?.method ?? request?.method ?? 'GET',
          origin: window.location.origin,
          silent: new Headers(init?.headers ?? request?.headers).has(SILENT_HEADER),
        })
        if (kind) end = loading.begin(kind)
      }
      catch {
        // Tracking is a courtesy and must never break the request itself.
      }
      const response = nativeFetch(input, init)
      return end ? response.finally(end) : response
    }

    // Decode the mark ahead of time so the first loader doesn't flash an empty ring.
    nuxtApp.hook('app:mounted', () => {
      new Image().src = '/brand/oqoudi-mark.png'
    })
  },
})
