import { randomBytes } from 'node:crypto'
import { createPaymobProvider } from './paymob'
import { createSimulatorProvider } from './simulator'
import type { PaymentProvider, ProviderId } from './types'

let devSecret: string | null = null

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/** Secret used to sign simulator webhooks (env, or a per-process random one in dev). */
export function simulatorSecret(): string {
  const configured = useRuntimeConfig().payments.simulatorSecret
  if (configured) return configured
  devSecret ??= randomBytes(32).toString('hex')
  return devSecret
}

export function activeProviderId(): ProviderId {
  const id = useRuntimeConfig().payments.provider
  return id === 'paymob' ? 'paymob' : 'simulator'
}

/** Returns a provider by id. The simulator can never be used in production. */
export function getPaymentProvider(id: ProviderId = activeProviderId()): PaymentProvider {
  const config = useRuntimeConfig()
  if (id === 'simulator') {
    if (isProduction()) {
      throw appError('OQ503_PAYMENTS')
    }
    return createSimulatorProvider(simulatorSecret(), config.public.siteUrl)
  }
  return createPaymobProvider({ apiKey: config.payments.paymob.apiKey, hmacSecret: config.payments.paymob.hmacSecret })
}
