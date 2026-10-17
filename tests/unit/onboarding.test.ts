import { describe, expect, it } from 'vitest'
import { validateOnboarding } from '#shared/domain/onboarding'

const valid = { fullName: 'أحمد سامي عبد الله', phone: '01001234567', accountKind: 'individual', companyName: '' }

describe('validateOnboarding', () => {
  it('accepts an individual and normalises the phone', () => {
    const r = validateOnboarding(valid)
    expect(r).toEqual({
      ok: true,
      value: { fullName: 'أحمد سامي عبد الله', phone: '+201001234567', accountKind: 'individual', companyName: null, locale: null },
    })
  })

  it('accepts +20 and spaced Egyptian numbers on every carrier prefix', () => {
    for (const phone of ['+201001234567', '+20 100 123 4567', '010-0123-4567', '01112345678', '01201234567', '01501234567']) {
      const r = validateOnboarding({ ...valid, phone })
      expect(r.ok, phone).toBe(true)
      if (r.ok) expect(r.value.phone).toMatch(/^\+201[0125]\d{8}$/)
    }
  })

  it('requires a name of at least 3 characters and collapses whitespace', () => {
    expect(validateOnboarding({ ...valid, fullName: '' })).toMatchObject({ ok: false, errors: { fullName: { code: 'required' } } })
    expect(validateOnboarding({ ...valid, fullName: '   ' })).toMatchObject({ ok: false, errors: { fullName: { code: 'required' } } })
    expect(validateOnboarding({ ...valid, fullName: 'ab' })).toMatchObject({ ok: false, errors: { fullName: { code: 'minLength', params: { min: 3 } } } })
    expect(validateOnboarding({ ...valid, fullName: 'x'.repeat(121) })).toMatchObject({ ok: false, errors: { fullName: { code: 'maxLength' } } })
    const r = validateOnboarding({ ...valid, fullName: '  منى   حسن  ' })
    expect(r.ok && r.value.fullName).toBe('منى حسن')
  })

  it('rejects missing and non-Egyptian phone numbers', () => {
    expect(validateOnboarding({ ...valid, phone: '' })).toMatchObject({ ok: false, errors: { phone: { code: 'required' } } })
    for (const phone of ['12345', '0100123456', '+14155550123', '02012345678', '01301234567', 'abcdefghijk', '+2010012345678']) {
      expect(validateOnboarding({ ...valid, phone }), phone).toMatchObject({ ok: false, errors: { phone: { code: 'phone' } } })
    }
  })

  it('requires a valid account type', () => {
    for (const accountKind of ['', 'admin', 'lawyer', null, undefined]) {
      expect(validateOnboarding({ ...valid, accountKind })).toMatchObject({ ok: false, errors: { accountKind: { code: 'invalidOption' } } })
    }
  })

  it('requires a company name only for company accounts', () => {
    expect(validateOnboarding({ ...valid, accountKind: 'company', companyName: '' })).toMatchObject({ ok: false, errors: { companyName: { code: 'required' } } })
    expect(validateOnboarding({ ...valid, accountKind: 'company', companyName: 'ش' })).toMatchObject({ ok: false, errors: { companyName: { code: 'minLength' } } })
    expect(validateOnboarding({ ...valid, accountKind: 'company', companyName: 'x'.repeat(161) })).toMatchObject({ ok: false, errors: { companyName: { code: 'maxLength' } } })

    const company = validateOnboarding({ ...valid, accountKind: 'company', companyName: 'شركة نيل للحلول التقنية' })
    expect(company).toMatchObject({ ok: true, value: { accountKind: 'company', companyName: 'شركة نيل للحلول التقنية' } })

    // A company name left over from toggling back to "individual" is discarded.
    const individual = validateOnboarding({ ...valid, accountKind: 'individual', companyName: 'شركة قديمة' })
    expect(individual).toMatchObject({ ok: true, value: { accountKind: 'individual', companyName: null } })
  })

  it('reports every failing field at once', () => {
    const r = validateOnboarding({ fullName: '', phone: 'x', accountKind: 'company', companyName: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['companyName', 'fullName', 'phone'])
  })

  it('keeps only a supported UI locale', () => {
    expect(validateOnboarding({ ...valid, locale: 'en' })).toMatchObject({ ok: true, value: { locale: 'en' } })
    expect(validateOnboarding({ ...valid, locale: 'ar' })).toMatchObject({ ok: true, value: { locale: 'ar' } })
    expect(validateOnboarding({ ...valid, locale: 'fr' })).toMatchObject({ ok: true, value: { locale: null } })
  })

  it('never carries identity fields: only the four form fields and the locale exist on the value', () => {
    const r = validateOnboarding({ ...valid, userId: 'victim', accountId: 'x', role: 'admin', email: 'a@b.c' } as never)
    expect(r.ok).toBe(true)
    if (r.ok) expect(Object.keys(r.value).sort()).toEqual(['accountKind', 'companyName', 'fullName', 'locale', 'phone'])
  })
})
