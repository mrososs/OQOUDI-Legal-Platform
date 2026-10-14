import type { Database } from '#shared/types/database.types'
import { fileExtension, sanitizeFileName } from '#shared/domain/uploads'

export interface UploadedFile {
  id: string
  name: string
  size: number
}

export type UploadPurpose = 'form' | 'message' | 'deliverable' | 'response'

export interface UploadTarget {
  purpose: UploadPurpose
  formVersionId?: string
  fieldId?: string
  orderId?: string
}

interface SignedUpload {
  documentId: string
  path: string
  token: string
  contentType: string
}

/**
 * Direct-to-storage upload through a server-issued signed URL:
 * 1. server validates + registers the document and signs an upload URL
 * 2. browser uploads the bytes straight to the private bucket
 * 3. server verifies the stored object and marks the document ready
 */
export function useUpload() {
  const supabase = useSupabaseClient<Database>()
  const { call } = useApi()

  async function upload(file: File, target: UploadTarget): Promise<UploadedFile> {
    const signed = await call<SignedUpload>('/api/uploads', {
      method: 'POST',
      body: {
        purpose: target.purpose,
        fileName: sanitizeFileName(file.name),
        sizeBytes: file.size,
        formVersionId: target.formVersionId ?? null,
        fieldId: target.fieldId ?? null,
        orderId: target.orderId ?? null,
      },
    })
    const { error } = await supabase.storage
      .from('order-documents')
      .uploadToSignedUrl(signed.path, signed.token, file, { contentType: signed.contentType })
    if (error) throw { code: 'OQ422_DOCUMENT_INVALID', message: error.message }
    await call(`/api/uploads/${signed.documentId}/complete`, { method: 'POST' })
    return { id: signed.documentId, name: file.name, size: file.size }
  }

  return { upload, fileExtension }
}
