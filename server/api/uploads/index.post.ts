import { z } from 'zod'
import { formFieldsSchema } from '#shared/domain/formSchema'
import { acceptedExtensionsFor, DEFAULT_FIELD_MAX_MB } from '#shared/domain/uploads'
import { createUpload } from '../../services/documents'

const bodySchema = z.object({
  purpose: z.enum(['form', 'message', 'deliverable', 'response']),
  fileName: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  orderId: z.uuid().nullish(),
  /** form uploads: which form version + field the file is for (limits come from the DB) */
  formVersionId: z.uuid().nullish(),
  fieldId: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/).nullish(),
})

/** Issues a signed upload URL for a validated, registered document. */
export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  rateLimit(event, 'uploads', 120, 60 * 60 * 1000)
  const body = await readBody_(event, bodySchema)

  let accept: ReturnType<typeof acceptedExtensionsFor> | undefined
  let maxSizeMb: number | undefined
  if (body.purpose === 'form') {
    if (!body.formVersionId || !body.fieldId) throw appError('OQ422_VALIDATION')
    const { data: version, error } = await adminClient(event)
      .from('service_form_versions')
      .select('fields, status')
      .eq('id', body.formVersionId)
      .maybeSingle()
    if (error) throw fromDbError(error, 'form_versions.select')
    if (!version || version.status !== 'published') throw appError('OQ409_FORM_OUTDATED')
    const field = formFieldsSchema.parse(version.fields).find(f => f.id === body.fieldId && f.type === 'file')
    if (!field) throw appError('OQ422_VALIDATION')
    accept = acceptedExtensionsFor(field.accept)
    maxSizeMb = field.maxSizeMb ?? DEFAULT_FIELD_MAX_MB
  }

  return await createUpload(event, actor.id, {
    purpose: body.purpose,
    fileName: body.fileName,
    sizeBytes: body.sizeBytes,
    orderId: body.purpose === 'form' ? null : (body.orderId ?? null),
    formFieldId: body.purpose === 'form' ? body.fieldId! : null,
    accept,
    maxSizeMb,
  })
})
