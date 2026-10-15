import { z } from 'zod'
export { sanitizeFileName as sanitizeProofName } from './uploads'

/**
 * Manual payment verification: customers transfer by InstaPay, Vodafone
 * Cash or PayPal, upload a proof image, and an admin approves or rejects it.
 * Shared by the client (early feedback) and the server (enforcement).
 */
export const MANUAL_METHODS = ['instapay', 'vodafone_cash', 'paypal'] as const
export type ManualMethod = (typeof MANUAL_METHODS)[number]

export function isManualMethod(v: unknown): v is ManualMethod {
  return typeof v === 'string' && (MANUAL_METHODS as readonly string[]).includes(v)
}

export const VERIFICATION_STATUSES = ['pending_review', 'approved', 'rejected'] as const
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

export const VERIFICATION_TONE: Record<VerificationStatus, 'caution' | 'positive' | 'critical'> = {
  pending_review: 'caution',
  approved: 'positive',
  rejected: 'critical',
}

/** `manual_demo` labels everything as a demo; `manual_live` needs an explicit, reviewed opt-in. */
export type PaymentMode = 'manual_demo' | 'manual_live'

// ---------------------------------------------------------------------
// Proof images
// ---------------------------------------------------------------------
export const PROOF_MAX_BYTES = 5 * 1024 * 1024
export const PROOF_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'] as const
export type ProofExtension = (typeof PROOF_EXTENSIONS)[number]
export const PROOF_MIME_BY_EXTENSION: Record<ProofExtension, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}
export const PROOF_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export type ProofMime = (typeof PROOF_MIME_TYPES)[number]
export const PROOF_ACCEPT_ATTR = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp'

export type ProofProblem = 'type' | 'size' | 'empty'

export function proofExtension(name: string): ProofExtension | null {
  const idx = name.lastIndexOf('.')
  const ext = idx >= 0 ? name.slice(idx + 1).toLowerCase() : ''
  return (PROOF_EXTENSIONS as readonly string[]).includes(ext) ? ext as ProofExtension : null
}

/** Client- and server-side pre-check on name/size/declared type. Content is sniffed on the server. */
export function checkProofFile(file: { name: string, size: number, type?: string }): ProofProblem | null {
  const ext = proofExtension(file.name)
  if (!ext) return 'type'
  if (file.type && !(PROOF_MIME_TYPES as readonly string[]).includes(file.type)) return 'type'
  if (!file.size) return 'empty'
  if (file.size > PROOF_MAX_BYTES) return 'size'
  return null
}

/** Detects PNG / JPEG / WEBP from magic bytes. Anything else → null. */
export function sniffImageMime(bytes: Uint8Array): ProofMime | null {
  const b = bytes
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 && b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A) {
    return 'image/png'
  }
  if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg'
  if (
    b.length >= 12
    && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 // RIFF
    && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // WEBP
  ) {
    return 'image/webp'
  }
  return null
}

// ---------------------------------------------------------------------
// Destinations (admin-configurable, platform_settings 'payments.manual')
// ---------------------------------------------------------------------
const destination = z.string().trim().max(120)

export const manualPaymentSettingsSchema = z.object({
  instapay: z.object({ destination }),
  vodafone_cash: z.object({ destination: destination.refine(v => v === '' || /^\+?[0-9 ]{8,16}$/.test(v), 'invalid_phone') }),
  paypal: z.object({ destination: destination.refine(v => v === '' || z.email().safeParse(v).success, 'invalid_email') }),
  max_attempts: z.number().int().min(1).max(10),
})
export type ManualPaymentSettings = z.infer<typeof manualPaymentSettingsSchema>

/** Non-payable placeholders shown in demo mode when no destination is configured. */
export const DEMO_PLACEHOLDERS: Record<ManualMethod, string> = {
  instapay: 'Demo account — not available for real transfers',
  vodafone_cash: 'Demo wallet — not available for real transfers',
  paypal: 'demo@example.invalid',
}

/** What the checkout receives for each method (from GET /api/payments/manual/config). */
export interface ManualMethodConfig {
  id: ManualMethod
  /** Transfer destination to show and copy. */
  destination: string
  /** True when `destination` is a demo placeholder, not a real account. */
  isPlaceholder: boolean
  /** False when the method cannot be used in the current mode. */
  available: boolean
  currency: 'EGP'
}

export interface ManualPaymentConfig {
  mode: PaymentMode
  demo: boolean
  methods: ManualMethodConfig[]
  maxBytes: number
  maxAttempts: number
}

// ---------------------------------------------------------------------
// Customer-facing state (A awaiting · B pending · C approved · D rejected)
// ---------------------------------------------------------------------
export type ManualPaymentState = 'awaiting' | 'pending' | 'approved' | 'rejected'

interface OrderLike {
  status: string
  paymentStatus: string
  totalMinor: number
  quoteIssuedAt: string | null
  service: { pricingType: string }
  manualSubmissions: { status: VerificationStatus }[]
}

/** True when the order may receive a (new) proof right now, ignoring the attempt cap. */
export function orderAcceptsProof(o: OrderLike): boolean {
  if (o.status !== 'awaiting_payment') return false
  if (o.paymentStatus !== 'unpaid' && o.paymentStatus !== 'failed') return false
  if (o.service.pricingType === 'quote' && !o.quoteIssuedAt) return false
  return o.totalMinor > 0
}

export function manualPaymentState(o: OrderLike, maxAttempts: number) {
  const latest = o.manualSubmissions[0]
  const attemptsLeft = Math.max(0, maxAttempts - o.manualSubmissions.length)
  const open = orderAcceptsProof(o)
  let state: ManualPaymentState | null = null
  if (latest?.status === 'pending_review') state = 'pending'
  else if (latest?.status === 'approved') state = 'approved'
  else if (latest?.status === 'rejected' && o.status !== 'cancelled') state = 'rejected'
  else if (open) state = 'awaiting'
  const canResubmit = state === 'rejected' && open && attemptsLeft > 0
  const canSubmit = (state === 'awaiting' || canResubmit) && attemptsLeft > 0
  return { state, attemptsLeft, canResubmit, canSubmit }
}
