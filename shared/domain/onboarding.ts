import { isEgyptianMobile, normalizeEgyptianMobile } from './validators'

/** Field rules for first-time customer onboarding — shared by the form and the server route. */
export const FULL_NAME_MIN = 3
export const FULL_NAME_MAX = 120
export const COMPANY_NAME_MIN = 2
export const COMPANY_NAME_MAX = 160

export type OnboardingAccountKind = 'individual' | 'company'
export type OnboardingField = 'fullName' | 'phone' | 'accountKind' | 'companyName'

export interface OnboardingInput {
  fullName?: string | null
  phone?: string | null
  accountKind?: string | null
  companyName?: string | null
  locale?: string | null
}

export interface OnboardingValue {
  fullName: string
  /** Normalised `+201XXXXXXXXX`. */
  phone: string
  accountKind: OnboardingAccountKind
  /** Present only for company accounts. */
  companyName: string | null
  locale: 'ar' | 'en' | null
}

/** Same shape as `ApiErrorData['fieldErrors']`, so server and form speak one language. */
export type OnboardingFieldErrors = Partial<Record<OnboardingField, { code: string, params?: Record<string, number | string> }>>

export type OnboardingResult =
  | { ok: true, value: OnboardingValue }
  | { ok: false, errors: OnboardingFieldErrors }

function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

export function validateOnboarding(input: OnboardingInput): OnboardingResult {
  const errors: OnboardingFieldErrors = {}

  const fullName = clean(input.fullName)
  if (!fullName) errors.fullName = { code: 'required' }
  else if (fullName.length < FULL_NAME_MIN) errors.fullName = { code: 'minLength', params: { min: FULL_NAME_MIN } }
  else if (fullName.length > FULL_NAME_MAX) errors.fullName = { code: 'maxLength', params: { max: FULL_NAME_MAX } }

  const rawPhone = (input.phone ?? '').trim()
  if (!rawPhone) errors.phone = { code: 'required' }
  else if (!isEgyptianMobile(rawPhone)) errors.phone = { code: 'phone' }

  const accountKind = input.accountKind === 'individual' || input.accountKind === 'company' ? input.accountKind : null
  if (!accountKind) errors.accountKind = { code: 'invalidOption' }

  const companyName = clean(input.companyName)
  if (accountKind === 'company') {
    if (!companyName) errors.companyName = { code: 'required' }
    else if (companyName.length < COMPANY_NAME_MIN) errors.companyName = { code: 'minLength', params: { min: COMPANY_NAME_MIN } }
    else if (companyName.length > COMPANY_NAME_MAX) errors.companyName = { code: 'maxLength', params: { max: COMPANY_NAME_MAX } }
  }

  if (Object.keys(errors).length || !accountKind) return { ok: false, errors }

  return {
    ok: true,
    value: {
      fullName,
      phone: normalizeEgyptianMobile(rawPhone),
      accountKind,
      companyName: accountKind === 'company' ? companyName : null,
      locale: input.locale === 'ar' || input.locale === 'en' ? input.locale : null,
    },
  }
}
