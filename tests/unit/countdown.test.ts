import { describe, expect, it } from 'vitest'
import { remainingParts } from '#shared/domain/pricing'
import { formatRemaining } from '../../app/utils/countdown'

const parts = (days: number, hours: number, minutes: number, seconds = 0) =>
  remainingParts(((days * 24 + hours) * 3600 + minutes * 60 + seconds) * 1000, 0)

describe('countdown text', () => {
  it('Arabic: days, zero-padded hours and minutes (Western digits, as in the approved copy)', () => {
    expect(formatRemaining(parts(12, 8, 35), 'ar')).toBe('12 يوم، 08 ساعات، 35 دقيقة')
  })

  it('English: pluralises correctly', () => {
    expect(formatRemaining(parts(12, 8, 35), 'en')).toBe('12 days, 08 hours, 35 minutes')
    expect(formatRemaining(parts(1, 1, 1), 'en')).toBe('1 day, 01 hour, 01 minute')
  })

  it('switches to minutes and seconds in the last hour', () => {
    expect(formatRemaining(parts(0, 0, 12, 5), 'en')).toBe('12 minutes, 05 seconds')
    expect(formatRemaining(parts(0, 0, 12, 5), 'ar')).toBe('12 دقيقة، 05 ثوانٍ')
  })

  it('shows zeroes (not negatives) after the end', () => {
    expect(formatRemaining(remainingParts(0, 10_000), 'en')).toBe('00 minutes, 00 seconds')
  })
})
