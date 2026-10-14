import type { PostgrestError } from '@supabase/supabase-js'
import type { z } from 'zod'
import { statusForCode, type ApiErrorData } from '#shared/domain/errors'

/** Creates an HTTP error carrying a stable application code in `data.code`. */
export function appError(code: string, fieldErrors?: ApiErrorData['fieldErrors']) {
  return createError({
    statusCode: statusForCode(code),
    statusMessage: code,
    data: { code, fieldErrors } satisfies ApiErrorData,
  })
}

/**
 * Maps a Postgres/PostgREST error to an app error. Business functions
 * raise `OQ…` codes (errcode P0001). Anything else is logged server-side
 * (without request payloads, which may contain personal data) and returned
 * as a generic 500.
 */
export function fromDbError(error: PostgrestError | { message?: string, code?: string }, context: string) {
  const message = error.message ?? ''
  if (/^OQ\d{3}[A-Z0-9_]*$/.test(message)) return appError(message)
  console.error(`[db] ${context} failed`, { code: error.code, message })
  return appError('OQ500')
}

/** Converts zod issues to `{ field: { code } }` for form-level display. */
export function zodFieldErrors(error: z.ZodError): ApiErrorData['fieldErrors'] {
  const out: NonNullable<ApiErrorData['fieldErrors']> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!out[key]) out[key] = { code: issue.message.startsWith('invalid_') ? 'invalidValue' : issue.message }
  }
  return out
}
