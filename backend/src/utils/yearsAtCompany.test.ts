import { describe, it, expect } from 'vitest'
import { normalizeYearsAtCompany, yearsAtCompanyWarning } from './yearsAtCompany'

describe('normalizeYearsAtCompany', () => {
  it('should return the number for valid whole numbers', () => {
    expect(normalizeYearsAtCompany(5)).toBe(5)
    expect(normalizeYearsAtCompany('5')).toBe(5)
    expect(normalizeYearsAtCompany(0)).toBe(0)
    expect(normalizeYearsAtCompany('0')).toBe(0)
  })

  it('should trim whitespace before validating strings', () => {
    expect(normalizeYearsAtCompany(' 7 ')).toBe(7)
  })

  it('should return undefined for non-numeric values', () => {
    expect(normalizeYearsAtCompany('five')).toBeUndefined()
    expect(normalizeYearsAtCompany('abc')).toBeUndefined()
  })

  it('should return undefined for negative numbers', () => {
    expect(normalizeYearsAtCompany(-1)).toBeUndefined()
    expect(normalizeYearsAtCompany('-1')).toBeUndefined()
  })

  it('should return undefined for non-integer numbers', () => {
    expect(normalizeYearsAtCompany(3.5)).toBeUndefined()
    expect(normalizeYearsAtCompany('3.5')).toBeUndefined()
  })

  it('should return undefined for unreasonably large values', () => {
    expect(normalizeYearsAtCompany(101)).toBeUndefined()
  })

  it('should return undefined for empty, null, or undefined values', () => {
    expect(normalizeYearsAtCompany('')).toBeUndefined()
    expect(normalizeYearsAtCompany(null)).toBeUndefined()
    expect(normalizeYearsAtCompany(undefined)).toBeUndefined()
  })
})

describe('yearsAtCompanyWarning', () => {
  it('should return undefined for valid, empty, or missing values', () => {
    expect(yearsAtCompanyWarning(5)).toBeUndefined()
    expect(yearsAtCompanyWarning('5')).toBeUndefined()
    expect(yearsAtCompanyWarning(0)).toBeUndefined()
    expect(yearsAtCompanyWarning('')).toBeUndefined()
    expect(yearsAtCompanyWarning(null)).toBeUndefined()
    expect(yearsAtCompanyWarning(undefined)).toBeUndefined()
  })

  it('should return a descriptive message for invalid values', () => {
    expect(yearsAtCompanyWarning('five')).toBe(
      'Invalid years at company "five" - must be a whole number between 0 and 100, field cleared'
    )
    expect(yearsAtCompanyWarning(-1)).toContain('"-1"')
    expect(yearsAtCompanyWarning(3.5)).toContain('"3.5"')
  })
})
