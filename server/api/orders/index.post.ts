import { z } from 'zod'
import { formFieldsSchema, validateAnswers } from '#shared/domain/formSchema'
import { acceptedExtensionsFor, DEFAULT_FIELD_MAX_MB } from '#shared/domain/uploads'

const repeaterRow = z.record(z.string().max(40), z.union([z.string().max(2000), z.number()]))
const answerValue = z.union([
  z.string().max(20000),
  z.number(),
  z.array(z.string().max(200)).max(30),
  z.array(repeaterRow).max(60),
  z.null(),
])

const bodySchema = z.object({
  serviceId: z.uuid(),
  formVersionId: z.uuid(),
  answers: z.record(z.string().max(40), answerValue),
  addonIds: z.array(z.uuid()).max(20).default([]),
  slotStart: z.iso.datetime({ offset: true }).nullish(),
})

/**
 * Creates an order. Answers are validated against the exact published form
 * version (same rules as the browser). Prices, snapshots, document
 * attachment and slot holds happen atomically in `order_create`.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  rateLimit(event, 'orders.create', 30, 60 * 60 * 1000)
  const body = await readBody_(event, bodySchema)
  const admin = adminClient(event)

  const { data: version, error } = await admin
    .from('service_form_versions')
    .select('id, service_id, status, fields')
    .eq('id', body.formVersionId)
    .maybeSingle()
  if (error) throw fromDbError(error, 'form_versions.select')
  if (!version || version.service_id !== body.serviceId || version.status !== 'published') {
    throw appError('OQ409_FORM_OUTDATED')
  }

  const fields = formFieldsSchema.parse(version.fields)
  const result = validateAnswers(fields, body.answers)
  if (!result.ok) {
    throw appError('OQ422_VALIDATION', result.errors as Record<string, { code: string }>)
  }

  // Every referenced document must be the actor's own staged upload for
  // that field, within the field's type/size rules.
  const documentIds = Object.values(result.documentIdsByField).flat()
  if (documentIds.length) {
    const { data: docs, error: docsError } = await admin
      .from('documents')
      .select('id, uploaded_by, order_id, status, kind, extension, size_bytes, form_field_id')
      .in('id', documentIds)
    if (docsError) throw fromDbError(docsError, 'documents.select')
    const byId = new Map((docs ?? []).map(d => [d.id, d]))
    for (const [fieldId, ids] of Object.entries(result.documentIdsByField)) {
      const field = fields.find(f => f.id === fieldId)!
      const accept = acceptedExtensionsFor(field.accept) as string[]
      const maxBytes = (field.maxSizeMb ?? DEFAULT_FIELD_MAX_MB) * 1024 * 1024
      for (const id of ids) {
        const d = byId.get(id)
        const valid = d
          && d.uploaded_by === actor.id
          && d.order_id === null
          && d.status === 'ready'
          && d.kind === 'customer_upload'
          && d.form_field_id === fieldId
          && accept.includes(d.extension)
          && d.size_bytes <= maxBytes
        if (!valid) throw appError('OQ422_VALIDATION', { [fieldId]: { code: 'invalidValue' } })
      }
    }
  }

  const created = await callFn(event, 'order_create', {
    p_actor: actor.id,
    p_service: body.serviceId,
    p_form_version: body.formVersionId,
    p_answers: result.normalized,
    p_addon_ids: body.addonIds,
    p_document_ids: documentIds,
    p_slot_start: (body.slotStart ?? null) as string,
  })

  return created as { id: string, orderNumber: string, status: string }
})
