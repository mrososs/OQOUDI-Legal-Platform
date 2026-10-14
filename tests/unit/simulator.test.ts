import { describe, expect, it, vi } from 'vitest'

// The simulator module uses h3's auto-imported getHeader in Nitro; provide it here.
vi.stubGlobal('getHeader', (event: { headers: Record<string, string> }, name: string) => event.headers[name.toLowerCase()])

const { buildSimulatorWebhook, createSimulatorProvider, signSimulatorPayload, SIMULATOR_SIGNATURE_HEADER } = await import('../../server/services/payments/simulator')

const secret = 'test-secret'
const provider = createSimulatorProvider(secret, 'http://localhost:3000')
const paymentId = '22222222-2222-4222-8222-222222222222'

function fakeEvent(signature: string) {
  return { headers: { [SIMULATOR_SIGNATURE_HEADER]: signature } } as never
}

describe('payment simulator webhook verification', () => {
  it('accepts a correctly signed payload', async () => {
    const raw = JSON.stringify(buildSimulatorWebhook(paymentId, 250000, true))
    const verified = await provider.verifyWebhook(fakeEvent(signSimulatorPayload(raw, secret)), raw)
    expect(verified).toMatchObject({ paymentId, success: true, amountMinor: 250000 })
  })

  it('rejects a tampered payload (amount changed after signing)', async () => {
    const raw = JSON.stringify(buildSimulatorWebhook(paymentId, 250000, true))
    const sig = signSimulatorPayload(raw, secret)
    const tampered = raw.replace('250000', '1')
    await expect(provider.verifyWebhook(fakeEvent(sig), tampered)).rejects.toThrow('invalid_signature')
  })

  it('rejects a payload signed with another secret or unsigned', async () => {
    const raw = JSON.stringify(buildSimulatorWebhook(paymentId, 250000, true))
    await expect(provider.verifyWebhook(fakeEvent(signSimulatorPayload(raw, 'other')), raw)).rejects.toThrow()
    await expect(provider.verifyWebhook(fakeEvent(''), raw)).rejects.toThrow()
  })

  it('creates a hosted-page checkout on our own simulator route', async () => {
    const session = await provider.createCheckout({
      paymentId, orderNumber: 'DQ-1', amountMinor: 100, currency: 'EGP', method: 'card',
      customer: { email: null, name: 'x', phone: null }, returnUrl: 'http://localhost:3000/x',
    })
    expect(session.redirectUrl.startsWith(`/dev/payment-simulator/${paymentId}`)).toBe(true)
  })
})
