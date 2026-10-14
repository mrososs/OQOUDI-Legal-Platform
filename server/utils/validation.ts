import type { H3Event } from 'h3'
import { z } from 'zod'

export const uuidSchema = z.uuid()

export async function readBody_<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.infer<T>> {
  const body = await readBody(event).catch(() => undefined)
  const parsed = schema.safeParse(body ?? {})
  if (!parsed.success) throw appError('OQ422_VALIDATION', zodFieldErrors(parsed.error))
  return parsed.data
}

export function routeUuid(event: H3Event, name = 'id'): string {
  const parsed = uuidSchema.safeParse(getRouterParam(event, name))
  if (!parsed.success) throw appError('OQ404')
  return parsed.data
}
