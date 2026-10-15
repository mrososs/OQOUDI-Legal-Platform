import { describe, expect, it } from 'vitest'
import {
  checkProofFile,
  manualPaymentSettingsSchema,
  manualPaymentState,
  orderAcceptsProof,
  sniffImageMime,
  PROOF_MAX_BYTES,
} from '#shared/domain/manualPayments'

const PNG = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0])
const JPEG = Uint8Array.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0])
const WEBP = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50])

describe('proof files', () => {
  it('detects images by magic bytes, not by name', () => {
    expect(sniffImageMime(PNG)).toBe('image/png')
    expect(sniffImageMime(JPEG)).toBe('image/jpeg')
    expect(sniffImageMime(WEBP)).toBe('image/webp')
    expect(sniffImageMime(new TextEncoder().encode('%PDF-1.4'))).toBeNull()
    expect(sniffImageMime(new TextEncoder().encode('<svg xmlns='))).toBeNull()
    expect(sniffImageMime(new Uint8Array())).toBeNull()
  })

  it('accepts PNG/JPG/JPEG/WEBP up to 5 MB', () => {
    expect(checkProofFile({ name: 'a.png', size: 10, type: 'image/png' })).toBeNull()
    expect(checkProofFile({ name: 'a.JPEG', size: 10 })).toBeNull()
    expect(checkProofFile({ name: 'a.webp', size: PROOF_MAX_BYTES })).toBeNull()
    expect(checkProofFile({ name: 'a.webp', size: PROOF_MAX_BYTES + 1 })).toBe('size')
    expect(checkProofFile({ name: 'a.png', size: 0 })).toBe('empty')
    expect(checkProofFile({ name: 'a.pdf', size: 10 })).toBe('type')
    expect(checkProofFile({ name: 'a.svg', size: 10 })).toBe('type')
    expect(checkProofFile({ name: 'a.png', size: 10, type: 'application/pdf' })).toBe('type')
    expect(checkProofFile({ name: 'noext', size: 10 })).toBe('type')
  })
})

describe('destination settings', () => {
  const base = { instapay: { destination: '' }, vodafone_cash: { destination: '' }, paypal: { destination: '' }, max_attempts: 3 }

  it('allows empty destinations and validates phone/email', () => {
    expect(manualPaymentSettingsSchema.safeParse(base).success).toBe(true)
    expect(manualPaymentSettingsSchema.safeParse({ ...base, vodafone_cash: { destination: '01006816005' } }).success).toBe(true)
    expect(manualPaymentSettingsSchema.safeParse({ ...base, vodafone_cash: { destination: 'call me' } }).success).toBe(false)
    expect(manualPaymentSettingsSchema.safeParse({ ...base, paypal: { destination: 'pay@example.com' } }).success).toBe(true)
    expect(manualPaymentSettingsSchema.safeParse({ ...base, paypal: { destination: 'not-an-email' } }).success).toBe(false)
    expect(manualPaymentSettingsSchema.safeParse({ ...base, max_attempts: 0 }).success).toBe(false)
    expect(manualPaymentSettingsSchema.safeParse({ ...base, max_attempts: 11 }).success).toBe(false)
  })
})

describe('customer payment state', () => {
  const order = (over: Partial<Parameters<typeof manualPaymentState>[0]> = {}) => ({
    status: 'awaiting_payment',
    paymentStatus: 'unpaid',
    totalMinor: 90000,
    quoteIssuedAt: null,
    service: { pricingType: 'fixed' },
    manualSubmissions: [] as { status: 'pending_review' | 'approved' | 'rejected' }[],
    ...over,
  })

  it('A: awaiting proof for a payable order', () => {
    expect(manualPaymentState(order(), 3)).toMatchObject({ state: 'awaiting', canSubmit: true, attemptsLeft: 3 })
  })

  it('B: pending review blocks new submissions', () => {
    expect(manualPaymentState(order({ manualSubmissions: [{ status: 'pending_review' }] }), 3)).toMatchObject({ state: 'pending', canSubmit: false })
  })

  it('C: approved', () => {
    const s = manualPaymentState(order({ status: 'in_progress', paymentStatus: 'paid', manualSubmissions: [{ status: 'approved' }] }), 3)
    expect(s).toMatchObject({ state: 'approved', canSubmit: false })
  })

  it('D: rejected allows a limited resubmission', () => {
    const one = manualPaymentState(order({ paymentStatus: 'failed', manualSubmissions: [{ status: 'rejected' }] }), 3)
    expect(one).toMatchObject({ state: 'rejected', canResubmit: true, attemptsLeft: 2 })
    const exhausted = manualPaymentState(order({ paymentStatus: 'failed', manualSubmissions: [{ status: 'rejected' }, { status: 'rejected' }, { status: 'rejected' }] }), 3)
    expect(exhausted).toMatchObject({ state: 'rejected', canResubmit: false, canSubmit: false, attemptsLeft: 0 })
  })

  it('nothing to pay for unissued quotes, cancelled or legacy-paid orders', () => {
    expect(manualPaymentState(order({ status: 'new', service: { pricingType: 'quote' } }), 3).state).toBeNull()
    expect(orderAcceptsProof(order({ service: { pricingType: 'quote' } }))).toBe(false)
    expect(orderAcceptsProof(order({ service: { pricingType: 'quote' }, quoteIssuedAt: '2026-10-15T10:00:00Z' }))).toBe(true)
    expect(manualPaymentState(order({ status: 'cancelled', manualSubmissions: [{ status: 'rejected' }] }), 3).state).toBeNull()
    expect(manualPaymentState(order({ status: 'in_progress', paymentStatus: 'paid' }), 3).state).toBeNull()
  })
})
