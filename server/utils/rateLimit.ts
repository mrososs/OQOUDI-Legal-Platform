import type { H3Event } from 'h3'

/**
 * Fixed-window in-memory rate limiter for sensitive public endpoints.
 * Suitable for a single Node instance; production behind several instances
 * should swap the store for Redis/Upstash (see docs/integrations.md).
 */
const buckets = new Map<string, { count: number, resetAt: number }>()

export function rateLimit(event: H3Event, scope: string, baseLimit: number, windowMs: number) {
  // Local development/test traffic all comes from one IP; keep limits meaningful in production only.
  const limit = process.env.NODE_ENV === 'production' ? baseLimit : baseLimit * 50
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const key = `${scope}:${ip}`
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
  }
  else {
    bucket.count += 1
    if (bucket.count > limit) {
      setResponseHeader(event, 'Retry-After', Math.ceil((bucket.resetAt - now) / 1000))
      throw appError('OQ429')
    }
  }
  if (buckets.size > 10000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  }
}
