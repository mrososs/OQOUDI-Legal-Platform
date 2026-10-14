import { describe, expect, it } from 'vitest'
import { formatMoney, toMinor } from '#shared/domain/money'
import { localize } from '#shared/domain/localized'
import { canCustomerCancel, canPay, staffStatusOptions } from '#shared/domain/orderStatus'
import { acceptedExtensionsFor, fileExtension, sanitizeFileName } from '#shared/domain/uploads'
import { isEgyptianMobile, isStrongPassword, normalizeEgyptianMobile } from '#shared/domain/validators'
import { statusForCode } from '#shared/domain/errors'
import { sectionContentSchema } from '#shared/domain/serviceSections'

describe('money', () => {
  it('formats EGP minor units in Arabic and English', () => {
    expect(formatMoney(250000, 'ar')).toBe('٢٬٥٠٠ ج.م')
    expect(formatMoney(250000, 'en')).toBe('EGP 2,500')
    expect(formatMoney(12345, 'en')).toBe('EGP 123.45')
  })
  it('converts pounds to integer piasters without float drift', () => {
    expect(toMinor(19.99)).toBe(1999)
    expect(toMinor(0.1 + 0.2)).toBe(30)
    expect(() => toMinor(-1)).toThrow()
  })
})

describe('localize', () => {
  it('falls back to Arabic when English is missing', () => {
    expect(localize({ ar: 'عقد' }, 'en')).toBe('عقد')
    expect(localize({ ar: 'عقد', en: 'Contract' }, 'en')).toBe('Contract')
    expect(localize({ ar: 'عقد', en: '  ' }, 'en')).toBe('عقد')
    expect(localize(null, 'ar')).toBe('')
  })
})

describe('order status helpers', () => {
  it('offers only legal staff transitions', () => {
    expect(staffStatusOptions('under_review', 'standard', false)).toEqual(['in_progress'])
    expect(staffStatusOptions('in_progress', 'video_consultation', false)).toContain('completed')
    expect(staffStatusOptions('in_progress', 'standard', false)).not.toContain('completed')
    expect(staffStatusOptions('delivered', 'standard', false)).toEqual([])
    expect(staffStatusOptions('delivered', 'standard', true)).toEqual(['completed'])
    expect(staffStatusOptions('completed', 'standard', true)).toEqual([])
  })
  it('knows when a customer can pay or cancel', () => {
    expect(canPay('awaiting_payment', 'failed', false, false)).toBe(true)
    expect(canPay('awaiting_payment', 'paid', false, false)).toBe(false)
    expect(canPay('awaiting_payment', 'unpaid', true, false)).toBe(false)
    expect(canPay('awaiting_payment', 'unpaid', true, true)).toBe(true)
    expect(canCustomerCancel('awaiting_payment', 'failed')).toBe(true)
    expect(canCustomerCancel('under_review', 'paid')).toBe(false)
  })
})

describe('uploads', () => {
  it('extracts and sanitizes names', () => {
    expect(fileExtension('Contract.Final.PDF')).toBe('pdf')
    expect(sanitizeFileName('..\\..\\etc/passwd')).toBe('....etcpasswd')
    expect(acceptedExtensionsFor(['pdf', 'jpg'])).toEqual(['pdf', 'jpg', 'jpeg'])
    expect(acceptedExtensionsFor(['exe' as never])).toEqual([])
  })
})

describe('validators', () => {
  it('validates Egyptian mobiles and normalizes them', () => {
    expect(isEgyptianMobile('+20 100 123 4567')).toBe(true)
    expect(isEgyptianMobile('01001234567')).toBe(true)
    expect(isEgyptianMobile('01301234567')).toBe(false)
    expect(normalizeEgyptianMobile('010 0123 4567')).toBe('+201001234567')
  })
  it('enforces the password policy', () => {
    expect(isStrongPassword('abcdefgh')).toBe(false)
    expect(isStrongPassword('abcd1234')).toBe(true)
  })
})

describe('errors', () => {
  it('maps codes to HTTP statuses', () => {
    expect(statusForCode('OQ404_ORDER')).toBe(404)
    expect(statusForCode('OQ409_SLOT_TAKEN')).toBe(409)
    expect(statusForCode('OQ422_SOMETHING_NEW')).toBe(422)
    expect(statusForCode('weird')).toBe(500)
  })
})

describe('service section content', () => {
  it('validates content per section key', () => {
    expect(sectionContentSchema('about').safeParse({ ar: 'وصف' }).success).toBe(true)
    expect(sectionContentSchema('included').safeParse([{ ar: 'بند' }]).success).toBe(true)
    expect(sectionContentSchema('faq').safeParse([{ q: { ar: 'س' }, a: { ar: 'ج' } }]).success).toBe(true)
    expect(sectionContentSchema('faq').safeParse([{ q: { ar: 'س' } }]).success).toBe(false)
    expect(sectionContentSchema('pricing').safeParse(null).success).toBe(true)
  })
})
