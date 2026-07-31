import { describe, it, expect } from 'vitest'
import { normalizeLinkedin, linkedinWarning } from './linkedin'

describe('normalizeLinkedin', () => {
  it('should accept a full https linkedin.com URL', () => {
    expect(normalizeLinkedin('https://www.linkedin.com/in/johndoe')).toBe(
      'https://www.linkedin.com/in/johndoe'
    )
  })

  it('should accept a linkedin.com URL without protocol', () => {
    expect(normalizeLinkedin('linkedin.com/in/johndoe')).toBe('https://linkedin.com/in/johndoe')
    expect(normalizeLinkedin('www.linkedin.com/in/johndoe')).toBe(
      'https://www.linkedin.com/in/johndoe'
    )
  })

  it('should trim whitespace before validating', () => {
    expect(normalizeLinkedin(' linkedin.com/in/johndoe ')).toBe('https://linkedin.com/in/johndoe')
  })

  it('should return undefined for non-linkedin URLs', () => {
    expect(normalizeLinkedin('https://twitter.com/johndoe')).toBeUndefined()
    expect(normalizeLinkedin('not a url')).toBeUndefined()
  })

  it('should return undefined for empty, null, or undefined values', () => {
    expect(normalizeLinkedin('')).toBeUndefined()
    expect(normalizeLinkedin(null)).toBeUndefined()
    expect(normalizeLinkedin(undefined)).toBeUndefined()
  })
})

describe('linkedinWarning', () => {
  it('should return undefined for valid, empty, or missing values', () => {
    expect(linkedinWarning('https://www.linkedin.com/in/johndoe')).toBeUndefined()
    expect(linkedinWarning('')).toBeUndefined()
    expect(linkedinWarning(null)).toBeUndefined()
    expect(linkedinWarning(undefined)).toBeUndefined()
  })

  it('should return a descriptive message for invalid values', () => {
    expect(linkedinWarning('https://twitter.com/johndoe')).toBe(
      'Invalid LinkedIn URL "https://twitter.com/johndoe" - must be a linkedin.com link, field cleared'
    )
  })

  it('should ignore non-string values', () => {
    expect(linkedinWarning(12 as unknown as string)).toBeUndefined()
  })
})
