import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import {
  DELIVERABLE_EXTENSIONS,
  MAX_UPLOAD_MB,
  MESSAGE_ATTACHMENT_EXTENSIONS,
  MIME_BY_EXTENSION,
  fileExtension,
  isAllowedExtension,
  sanitizeFileName,
  type AllowedExtension,
} from '#shared/domain/uploads'

export const DOCUMENTS_BUCKET = 'order-documents'
const DOWNLOAD_URL_TTL_SECONDS = 60

export type UploadPurpose = 'form' | 'message' | 'deliverable' | 'response'

export interface UploadRequest {
  purpose: UploadPurpose
  fileName: string
  sizeBytes: number
  orderId: string | null
  formFieldId: string | null
  /** For `form` uploads: the field's accepted extensions / size limit, resolved server-side. */
  accept?: readonly AllowedExtension[]
  maxSizeMb?: number
}

const KIND_BY_PURPOSE = {
  form: 'customer_upload',
  message: 'message_attachment',
  deliverable: 'deliverable',
  response: 'consultation_response',
} as const

function allowedFor(req: UploadRequest): readonly AllowedExtension[] {
  if (req.purpose === 'form') return req.accept ?? []
  if (req.purpose === 'message') return MESSAGE_ATTACHMENT_EXTENSIONS
  return DELIVERABLE_EXTENSIONS
}

/**
 * Registers a pending document and returns a short-lived signed upload URL
 * for an unpredictable object path. Ownership/role checks happen in SQL
 * (document_register_upload).
 */
export async function createUpload(event: H3Event, actorId: string, req: UploadRequest) {
  const name = sanitizeFileName(req.fileName)
  const ext = fileExtension(name)
  const allowed = allowedFor(req)
  if (!isAllowedExtension(ext) || !allowed.includes(ext)) throw appError('OQ422_UPLOAD_TYPE')
  const maxBytes = Math.min(req.maxSizeMb ?? MAX_UPLOAD_MB, MAX_UPLOAD_MB) * 1024 * 1024
  if (!Number.isInteger(req.sizeBytes) || req.sizeBytes <= 0 || req.sizeBytes > maxBytes) throw appError('OQ422_UPLOAD_SIZE')

  const path = `docs/${randomUUID()}.${ext}`
  const documentId = await callFn(event, 'document_register_upload', {
    p_actor: actorId,
    p_kind: KIND_BY_PURPOSE[req.purpose],
    p_order: req.orderId as string,
    p_original_name: name,
    p_extension: ext,
    p_mime_type: MIME_BY_EXTENSION[ext],
    p_size_bytes: req.sizeBytes,
    p_form_field_id: req.formFieldId as string,
    p_storage_path: path,
  })

  const { data, error } = await adminClient(event).storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path)
  if (error || !data) throw fromDbError({ message: error?.message ?? 'signed upload failed' }, 'storage.createSignedUploadUrl')

  return { documentId: documentId as string, path, token: data.token, contentType: MIME_BY_EXTENSION[ext], maxBytes }
}

/** Verifies the object really exists with an acceptable size, then marks it ready. */
export async function completeUpload(event: H3Event, actorId: string, documentId: string) {
  const admin = adminClient(event)
  const { data: doc, error } = await admin
    .from('documents')
    .select('id, storage_path, uploaded_by, status, size_bytes, mime_type')
    .eq('id', documentId)
    .maybeSingle()
  if (error) throw fromDbError(error, 'documents.select')
  if (!doc || doc.uploaded_by !== actorId) throw appError('OQ404_DOCUMENT')
  if (doc.status === 'ready') return { documentId, sizeBytes: doc.size_bytes }

  const [folder, file] = doc.storage_path.split('/') as [string, string]
  const { data: objects, error: listError } = await admin.storage.from(DOCUMENTS_BUCKET).list(folder, { search: file, limit: 1 })
  if (listError) throw fromDbError({ message: listError.message }, 'storage.list')
  const object = objects?.find(o => o.name === file)
  const size = Number((object?.metadata as { size?: number } | undefined)?.size ?? 0)
  const mime = (object?.metadata as { mimetype?: string } | undefined)?.mimetype
  // The declared size is the upper bound the upload URL was issued for.
  if (!object || size <= 0 || size > Math.max(doc.size_bytes, 1) * 1.01 + 1024 || (mime && mime !== doc.mime_type)) {
    await admin.storage.from(DOCUMENTS_BUCKET).remove([doc.storage_path])
    throw appError('OQ422_DOCUMENT_INVALID')
  }

  await callFn(event, 'document_mark_ready', { p_actor: actorId, p_document: documentId, p_size_bytes: size })
  return { documentId, sizeBytes: size }
}

/**
 * Short-lived signed download URL. The lookup uses the caller's own
 * RLS-scoped client, so a document is only reachable if RLS allows it.
 */
async function findReadableDocument(event: H3Event, documentId: string) {
  const { serverSupabaseClient } = await import('#supabase/server')
  const userClient = await serverSupabaseClient(event)
  const { data: doc, error } = await userClient
    .from('documents')
    .select('id, storage_path, original_name, mime_type, status')
    .eq('id', documentId)
    .maybeSingle()
  if (error) throw fromDbError(error, 'documents.select')
  if (!doc || doc.status !== 'ready') throw appError('OQ404_DOCUMENT')
  return doc
}

/** Pre-flight: confirms access and returns our own streaming URL. */
export async function createDownloadUrl(event: H3Event, documentId: string) {
  const doc = await findReadableDocument(event, documentId)
  return { url: `/api/documents/${doc.id}/file`, expiresIn: DOWNLOAD_URL_TTL_SECONDS }
}

/**
 * Streams the file to the browser. A 60-second signed URL is used
 * server-side only (storage URLs never reach the browser), and the
 * filename header is RFC 5987-encoded so Arabic names survive — Storage's
 * own Content-Disposition double-encodes non-ASCII names.
 */
export async function streamDocument(event: H3Event, documentId: string) {
  const doc = await findReadableDocument(event, documentId)
  const { data, error } = await adminClient(event)
    .storage.from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, DOWNLOAD_URL_TTL_SECONDS)
  if (error || !data) throw fromDbError({ message: error?.message ?? 'sign failed' }, 'storage.createSignedUrl')

  const upstream = await fetch(data.signedUrl)
  if (!upstream.ok || !upstream.body) throw appError('OQ404_DOCUMENT')

  const asciiFallback = doc.original_name.replace(/[^\x20-\x7E]+/g, '_').replace(/["\\]/g, '_')
  setResponseHeader(event, 'content-type', doc.mime_type)
  setResponseHeader(event, 'content-disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(doc.original_name)}`)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  setResponseHeader(event, 'x-content-type-options', 'nosniff')
  const length = upstream.headers.get('content-length')
  if (length) setResponseHeader(event, 'content-length', Number(length))
  return sendStream(event, upstream.body as unknown as ReadableStream)
}
