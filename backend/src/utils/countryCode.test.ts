import { describe, it, expect } from 'vitest'
import { normalizeCountryCode, countryCodeWarning } from './countryCode'

describe('normalizeCountryCode', () => {
  it('should uppercase valid 2-letter codes', () => {
    expect(normalizeCountryCode('us')).toBe('US')
    expect(normalizeCountryCode('Us')).toBe('US')
    expect(normalizeCountryCode('US')).toBe('US')
  })

  it('should trim whitespace before validating', () => {
    expect(normalizeCountryCode(' us ')).toBe('US')
  })

  it('should return undefined for invalid formats', () => {
    expect(normalizeCountryCode('USA')).toBeUndefined()
    expect(normalizeCountryCode('XXX')).toBeUndefined()
    expect(normalizeCountryCode('12')).toBeUndefined()
    expect(normalizeCountryCode('U1')).toBeUndefined()
    expect(normalizeCountryCode('')).toBeUndefined()
  })

  it('should return undefined for null/undefined input', () => {
    expect(normalizeCountryCode(null)).toBeUndefined()
    expect(normalizeCountryCode(undefined)).toBeUndefined()
  })
})

describe('countryCodeWarning', () => {
  it('should return undefined for valid, empty, or missing values', () => {
    expect(countryCodeWarning('US')).toBeUndefined()
    expect(countryCodeWarning('us')).toBeUndefined()
    expect(countryCodeWarning('')).toBeUndefined()
    expect(countryCodeWarning(null)).toBeUndefined()
    expect(countryCodeWarning(undefined)).toBeUndefined()
  })

  it('should return a descriptive message for invalid values', () => {
    expect(countryCodeWarning('XXX')).toBe(
      'Invalid country code "XXX" - must be exactly 2 letters, field cleared'
    )
    expect(countryCodeWarning('12')).toContain('"12"')
    expect(countryCodeWarning('USA')).toContain('"USA"')
  })

  it('should ignore non-string values', () => {
    expect(countryCodeWarning(12 as unknown as string)).toBeUndefined()
  })
})
