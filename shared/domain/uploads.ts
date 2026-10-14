/** File upload rules shared by the client (early feedback) and server (enforcement). */
export const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp'] as const
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number]

export const MIME_BY_EXTENSION: Record<AllowedExtension, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** Hard ceiling for any upload (bucket limit is 25 MB). */
export const MAX_UPLOAD_MB = 25
export const DEFAULT_FIELD_MAX_MB = 10
export const DEFAULT_MAX_FILES = 5

/** Extensions staff may use for deliverables / answers. */
export const DELIVERABLE_EXTENSIONS: readonly AllowedExtension[] = ['pdf', 'doc', 'docx']
export const MESSAGE_ATTACHMENT_EXTENSIONS: readonly AllowedExtension[] = ['pdf', 'docx', 'jpg', 'jpeg', 'png']

export function fileExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : ''
}

export function isAllowedExtension(ext: string): ext is AllowedExtension {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
}

/** Sanitized display name: strip path separators/control chars, cap length. */
export function sanitizeFileName(name: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = name.replace(/[\\/\u0000-\u001f\u007f]/g, '').trim()
  return (cleaned || 'file').slice(-180)
}

/** Accept-list for a form field (jpg implies jpeg). */
export function acceptedExtensionsFor(accept: readonly string[] | undefined): AllowedExtension[] {
  const base = (accept && accept.length ? accept : ['pdf', 'docx', 'jpg', 'png']).filter(isAllowedExtension)
  const set = new Set<AllowedExtension>(base)
  if (set.has('jpg')) set.add('jpeg')
  return [...set]
}
