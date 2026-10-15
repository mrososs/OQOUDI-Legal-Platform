import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import {
  DEMO_PLACEHOLDERS,
  MANUAL_METHODS,
  PROOF_MAX_BYTES,
  PROOF_MIME_BY_EXTENSION,
  checkProofFile,
  manualPaymentSettingsSchema,
  proofExtension,
  sniffImageMime,
  type ManualMethod,
  type ManualMethodConfig,
  type ManualPaymentConfig,
  type ManualPaymentSettings,
  type PaymentMode,
} from '#shared/domain/manualPayments'

export const PROOFS_BUCKET = 'payment-proofs'
export const PROOF_URL_TTL_SECONDS = 60

/** Must match exactly to honour PAYMENT_MODE=manual_live (see docs/payments). */
export const LIVE_ACKNOWLEDGEMENT = 'manual-live-reviewed'

/**
 * Payment mode is server-controlled. Anything other than an explicit,
 * acknowledged `manual_live` is demo — never inferred from NODE_ENV or
 * from anything the browser sends.
 */
export function resolvePaymentMode(): PaymentMode {
  const { mode, liveAcknowledged } = useRuntimeConfig().payments
  return mode === 'manual_live' && liveAcknowledged === LIVE_ACKNOWLEDGEMENT ? 'manual_live' : 'manual_demo'
}

const FALLBACK_SETTINGS: ManualPaymentSettings = {
  instapay: { destination: '' },
  vodafone_cash: { destination: '' },
  paypal: { destination: '' },
  max_attempts: 3,
}

export async function loadManualSettings(event: H3Event): Promise<ManualPaymentSettings> {
  const { data, error } = await adminClient(event)
    .from('platform_settings')
    .select('value')
    .eq('key', 'payments.manual')
    .maybeSingle()
  if (error) throw fromDbError(error, 'platform_settings.select')
  const parsed = manualPaymentSettingsSchema.safeParse(data?.value)
  return parsed.success ? parsed.data : FALLBACK_SETTINGS
}

/** Destinations per method for the current mode (placeholders only in demo mode). */
export async function manualPaymentConfig(event: H3Event): Promise<ManualPaymentConfig> {
  const mode = resolvePaymentMode()
  const demo = mode === 'manual_demo'
  const settings = await loadManualSettings(event)
  const methods: ManualMethodConfig[] = MANUAL_METHODS.map((id) => {
    const configured = settings[id].destination.trim()
    if (configured) return { id, destination: configured, isPlaceholder: false, available: true, currency: 'EGP' }
    return { id, destination: demo ? DEMO_PLACEHOLDERS[id] : '', isPlaceholder: true, available: demo, currency: 'EGP' }
  })
  return { mode, demo, methods, maxBytes: PROOF_MAX_BYTES, maxAttempts: settings.max_attempts }
}

export async function assertMethodAvailable(event: H3Event, method: ManualMethod) {
  const config = await manualPaymentConfig(event)
  const entry = config.methods.find(m => m.id === method)
  if (!entry?.available) throw appError('OQ503_PAYMENT_METHOD_UNAVAILABLE')
  return config
}

/** The caller must be a member of the order's customer account. */
export async function assertOrderCustomer(event: H3Event, actorId: string, orderId: string) {
  const admin = adminClient(event)
  const { data: order, error } = await admin
    .from('orders')
    .select('id, customer_account_id, status, payment_status')
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw fromDbError(error, 'orders.select')
  if (!order) throw appError('OQ404_ORDER')
  const { data: member } = await admin
    .from('customer_account_members')
    .select('user_id')
    .eq('account_id', order.customer_account_id)
    .eq('user_id', actorId)
    .maybeSingle()
  if (!member) throw appError('OQ404_ORDER')
  return order
}

/**
 * Signs a direct-to-storage upload for an unpredictable path scoped to the
 * order and the uploader: <order>/<actor>/<uuid>.<ext>. The SQL submit
 * function re-checks this shape, so a path issued to someone else (or for
 * another order) can never be attached.
 */
export async function createProofUpload(event: H3Event, actorId: string, orderId: string, file: { fileName: string, sizeBytes: number, mimeType?: string }) {
  const problem = checkProofFile({ name: file.fileName, size: file.sizeBytes, type: file.mimeType })
  if (problem === 'type') throw appError('OQ422_PROOF_TYPE')
  if (problem) throw appError('OQ422_PROOF_SIZE')
  const ext = proofExtension(file.fileName)!
  const path = `${orderId}/${actorId}/${randomUUID()}.${ext}`
  const { data, error } = await adminClient(event).storage.from(PROOFS_BUCKET).createSignedUploadUrl(path)
  if (error || !data) throw fromDbError({ message: error?.message ?? 'signed upload failed' }, 'storage.createSignedUploadUrl')
  return { path, token: data.token, signedUrl: data.signedUrl, contentType: PROOF_MIME_BY_EXTENSION[ext], maxBytes: PROOF_MAX_BYTES }
}

/**
 * Verifies the uploaded object: it exists, is within 5 MB and really is a
 * PNG / JPEG / WEBP (magic bytes, not the declared type). Invalid objects
 * are deleted.
 */
export async function verifyProofObject(event: H3Event, path: string) {
  const bucket = adminClient(event).storage.from(PROOFS_BUCKET)
  const { data: blob, error } = await bucket.download(path)
  if (error || !blob) throw appError('OQ422_PROOF_INVALID')
  const size = blob.size
  const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer())
  const mime = sniffImageMime(head)
  if (!mime || size <= 0 || size > PROOF_MAX_BYTES) {
    await bucket.remove([path])
    throw appError(mime ? 'OQ422_PROOF_SIZE' : 'OQ422_PROOF_TYPE')
  }
  return { size, mime }
}

/** Short-lived signed preview URL for a proof the caller may see. */
export async function signProofUrl(event: H3Event, path: string) {
  const { data, error } = await adminClient(event).storage.from(PROOFS_BUCKET).createSignedUrl(path, PROOF_URL_TTL_SECONDS)
  if (error || !data) throw fromDbError({ message: error?.message ?? 'sign failed' }, 'storage.createSignedUrl')
  return { url: data.signedUrl, expiresIn: PROOF_URL_TTL_SECONDS }
}
