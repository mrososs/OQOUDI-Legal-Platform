import { describe, expect, it } from 'vitest'
import { ONBOARDING_PATH, resolvePostAuthTarget, safeRedirectPath } from '#shared/domain/postAuth'
import { statusForCode } from '#shared/domain/errors'

describe('safeRedirectPath', () => {
  it('accepts ordinary same-origin app paths, with and without a locale prefix', () => {
    expect(safeRedirectPath('/account')).toBe('/account')
    expect(safeRedirectPath('/en/account/orders?tab=active')).toBe('/en/account/orders?tab=active')
    expect(safeRedirectPath('/service/lease-agreement/request#form')).toBe('/service/lease-agreement/request#form')
    expect(safeRedirectPath('/dashboard/requests/OQ-1001')).toBe('/dashboard/requests/OQ-1001')
  })

  it('rejects anything that is not a plain same-origin path (open redirects)', () => {
    for (const bad of [
      '//evil.example', '///evil.example', 'https://evil.example', 'http://evil.example/x',
      'javascript:alert(1)', '/\\evil.example', '\\\\evil.example', 'evil.example', '', '   ',
      '/\t/evil.example', '/\n/evil.example', '/\u0000x',
    ]) {
      expect(safeRedirectPath(bad), JSON.stringify(bad)).toBeNull()
    }
  })

  it('rejects non-strings', () => {
    for (const bad of [undefined, null, 42, {}, ['/account'], true]) {
      expect(safeRedirectPath(bad)).toBeNull()
    }
  })

  it('never targets the auth flow or onboarding itself (no redirect loops)', () => {
    for (const bad of [
      '/auth/login', '/auth/register', '/auth/callback', '/auth/callback?code=abc', '/auth',
      '/en/auth/login', '/en/auth/callback', ONBOARDING_PATH, `/en${ONBOARDING_PATH}`, `${ONBOARDING_PATH}?redirect=/account`,
    ]) {
      expect(safeRedirectPath(bad), bad).toBeNull()
    }
  })

  it('does not over-block lookalike public paths', () => {
    expect(safeRedirectPath('/authors')).toBe('/authors')
    expect(safeRedirectPath('/account/complete-profile-help')).toBe('/account/complete-profile-help')
  })
})

describe('resolvePostAuthTarget', () => {
  const customerDone = { isStaff: false, needsOnboarding: false }
  const customerNew = { isStaff: false, needsOnboarding: true }
  const staff = { isStaff: true, needsOnboarding: false }

  it('sends a completed customer to the account, or to a safe requested page', () => {
    expect(resolvePostAuthTarget(customerDone)).toEqual({ path: '/account', localized: false, redirect: null })
    expect(resolvePostAuthTarget(customerDone, '/en/account/orders')).toEqual({ path: '/en/account/orders', localized: true, redirect: null })
  })

  it('sends an incomplete customer to onboarding and keeps the safe destination for afterwards', () => {
    expect(resolvePostAuthTarget(customerNew)).toEqual({ path: ONBOARDING_PATH, localized: false, redirect: null })
    expect(resolvePostAuthTarget(customerNew, '/service/lease-agreement/request')).toEqual({
      path: ONBOARDING_PATH, localized: false, redirect: '/service/lease-agreement/request',
    })
  })

  it('drops an unsafe destination instead of carrying it through onboarding', () => {
    expect(resolvePostAuthTarget(customerNew, '//evil.example').redirect).toBeNull()
    expect(resolvePostAuthTarget(customerDone, 'https://evil.example').path).toBe('/account')
  })

  it('never routes staff through customer onboarding, even if the flag says incomplete', () => {
    expect(resolvePostAuthTarget(staff)).toEqual({ path: '/dashboard', localized: false, redirect: null })
    expect(resolvePostAuthTarget({ isStaff: true, needsOnboarding: true }).path).toBe('/dashboard')
    expect(resolvePostAuthTarget(staff, '/dashboard/requests').path).toBe('/dashboard/requests')
  })

  it('cannot be looped: the result for a completed customer is never onboarding or auth', () => {
    for (const redirect of [ONBOARDING_PATH, '/auth/login', '/auth/callback', `/en${ONBOARDING_PATH}`]) {
      expect(resolvePostAuthTarget(customerDone, redirect).path).toBe('/account')
    }
  })
})

describe('onboarding error codes', () => {
  it('map to the intended HTTP statuses', () => {
    expect(statusForCode('OQ403_ONBOARDING')).toBe(403)
    expect(statusForCode('OQ422_ONBOARDING')).toBe(422)
    expect(statusForCode('OQ409_ACCOUNT_KIND_LOCKED')).toBe(409)
  })
})
