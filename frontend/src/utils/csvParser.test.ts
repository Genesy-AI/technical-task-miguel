import { describe, it, expect } from 'vitest'
import {
  parseCsv,
  isValidEmail,
  normalizeCountryCode,
  countryCodeWarning,
  normalizeYearsAtCompany,
  yearsAtCompanyWarning,
  normalizeLinkedin,
  linkedinWarning,
} from './csvParser'

describe('isValidEmail', () => {
  it('should return true for valid email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    expect(isValidEmail('first.last+tag@example.org')).toBe(true)
    expect(isValidEmail('123@456.com')).toBe(true)
  })

  it('should return false for invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('invalid')).toBe(false)
    expect(isValidEmail('test@')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
    expect(isValidEmail('test.example.com')).toBe(false)
    expect(isValidEmail('test@.com')).toBe(false)
    expect(isValidEmail('test@example')).toBe(false)
  })
})

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
    expect(normalizeCountryCode(undefined)).toBeUndefined()
  })
})

describe('countryCodeWarning', () => {
  it('should return undefined for valid or empty values', () => {
    expect(countryCodeWarning('US')).toBeUndefined()
    expect(countryCodeWarning('us')).toBeUndefined()
    expect(countryCodeWarning('')).toBeUndefined()
  })

  it('should return a descriptive message for invalid values', () => {
    expect(countryCodeWarning('XXX')).toBe(
      'Invalid country code "XXX" - must be exactly 2 letters, field cleared'
    )
    expect(countryCodeWarning('12')).toContain('"12"')
  })
})

describe('normalizeYearsAtCompany', () => {
  it('should return the number for valid whole numbers', () => {
    expect(normalizeYearsAtCompany('5')).toBe(5)
    expect(normalizeYearsAtCompany('0')).toBe(0)
  })

  it('should trim whitespace before validating', () => {
    expect(normalizeYearsAtCompany(' 7 ')).toBe(7)
  })

  it('should return undefined for invalid values', () => {
    expect(normalizeYearsAtCompany('five')).toBeUndefined()
    expect(normalizeYearsAtCompany('-1')).toBeUndefined()
    expect(normalizeYearsAtCompany('3.5')).toBeUndefined()
    expect(normalizeYearsAtCompany('')).toBeUndefined()
    expect(normalizeYearsAtCompany(undefined)).toBeUndefined()
  })
})

describe('yearsAtCompanyWarning', () => {
  it('should return undefined for valid or empty values', () => {
    expect(yearsAtCompanyWarning('5')).toBeUndefined()
    expect(yearsAtCompanyWarning('0')).toBeUndefined()
    expect(yearsAtCompanyWarning('')).toBeUndefined()
  })

  it('should return a descriptive message for invalid values', () => {
    expect(yearsAtCompanyWarning('five')).toBe(
      'Invalid years at company "five" - must be a whole number between 0 and 100, field cleared'
    )
    expect(yearsAtCompanyWarning('-1')).toContain('"-1"')
  })
})

describe('normalizeLinkedin', () => {
  it('should accept a linkedin.com URL with or without protocol', () => {
    expect(normalizeLinkedin('https://www.linkedin.com/in/johndoe')).toBe(
      'https://www.linkedin.com/in/johndoe'
    )
    expect(normalizeLinkedin('linkedin.com/in/johndoe')).toBe('https://linkedin.com/in/johndoe')
  })

  it('should trim whitespace before validating', () => {
    expect(normalizeLinkedin(' linkedin.com/in/johndoe ')).toBe('https://linkedin.com/in/johndoe')
  })

  it('should return undefined for non-linkedin URLs or invalid values', () => {
    expect(normalizeLinkedin('https://twitter.com/johndoe')).toBeUndefined()
    expect(normalizeLinkedin('not a url')).toBeUndefined()
    expect(normalizeLinkedin(undefined)).toBeUndefined()
  })
})

describe('linkedinWarning', () => {
  it('should return undefined for valid or empty values', () => {
    expect(linkedinWarning('https://www.linkedin.com/in/johndoe')).toBeUndefined()
    expect(linkedinWarning('')).toBeUndefined()
  })

  it('should return a descriptive message for invalid values', () => {
    expect(linkedinWarning('https://twitter.com/johndoe')).toBe(
      'Invalid LinkedIn URL "https://twitter.com/johndoe" - must be a linkedin.com link, field cleared'
    )
  })
})

describe('parseCsv', () => {
  it('should throw error for empty content', () => {
    expect(() => parseCsv('')).toThrow('CSV content cannot be empty')
    expect(() => parseCsv('   ')).toThrow('CSV content cannot be empty')
  })

  it('should throw error for CSV with only headers', () => {
    const csv = 'firstName,lastName,email'
    expect(() => parseCsv(csv)).toThrow('CSV file appears to be empty or contains no valid data')
  })

  it('should throw error for malformed CSV content', () => {
    const malformedCsv = `firstName,lastName,email
"John,Doe,john@example.com,extra"field`
    expect(() => parseCsv(malformedCsv)).toThrow('CSV parsing failed')
  })

  it('should throw error for CSV with mismatched field count', () => {
    const mismatchedCsv = `firstName,lastName,email
John,Doe,john@example.com,ExtraField,AnotherExtra
Jane,Smith`
    expect(() => parseCsv(mismatchedCsv)).toThrow('CSV parsing failed')
  })

  it('should throw error for CSV with critical delimiter issues', () => {
    const noDelimiterCsv = `firstName lastName email
John Doe john@example.com`
    expect(() => parseCsv(noDelimiterCsv)).toThrow()
  })

  it('should parse valid CSV with all required fields', () => {
    const csv = `firstName,lastName,email,jobTitle,countryCode,companyName
John,Doe,john.doe@example.com,Developer,US,Tech Corp`

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      jobTitle: 'Developer',
      countryCode: 'US',
      companyName: 'Tech Corp',
      isValid: true,
      errors: [],
      warnings: [],
      rowIndex: 2,
    })
  })

  it('should handle missing required fields and mark as invalid', () => {
    const csv = `firstName,lastName,email
,Smith,john@example.com
John,,john@example.com
John,Smith,`

    const result = parseCsv(csv)

    expect(result).toHaveLength(3)

    expect(result[0].isValid).toBe(false)
    expect(result[0].errors).toContain('First name is required')

    expect(result[1].isValid).toBe(false)
    expect(result[1].errors).toContain('Last name is required')

    expect(result[2].isValid).toBe(false)
    expect(result[2].errors).toContain('Email is required')
  })

  it('should validate email format', () => {
    const csv = `firstName,lastName,email
John,Doe,invalid-email
Jane,Smith,jane@example.com`

    const result = parseCsv(csv)

    expect(result).toHaveLength(2)
    expect(result[0].isValid).toBe(false)
    expect(result[0].errors).toContain('Invalid email format')
    expect(result[1].isValid).toBe(true)
  })

  it('should handle CSV with quoted values', () => {
    const csv = `firstName,lastName,email,jobTitle
"John","Doe","john.doe@example.com","Software Engineer"`

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0].firstName).toBe('John')
    expect(result[0].lastName).toBe('Doe')
    expect(result[0].email).toBe('john.doe@example.com')
    expect(result[0].jobTitle).toBe('Software Engineer')
  })

  it('should skip empty rows', () => {
    const csv = `firstName,lastName,email
John,Doe,john@example.com
,,
Jane,Smith,jane@example.com`

    const result = parseCsv(csv)

    expect(result).toHaveLength(2)
    expect(result[0].firstName).toBe('John')
    expect(result[1].firstName).toBe('Jane')
  })

  it('should handle case-insensitive headers', () => {
    const csv = `FIRSTNAME,LASTNAME,EMAIL,JOBTITLE,COUNTRYCODE,COMPANYNAME
John,Doe,john@example.com,Developer,US,Tech Corp`

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0].firstName).toBe('John')
    expect(result[0].lastName).toBe('Doe')
    expect(result[0].email).toBe('john@example.com')
    expect(result[0].jobTitle).toBe('Developer')
  })

  it('should handle missing optional fields', () => {
    const csv = `firstName,lastName,email,jobTitle,countryCode
John,Doe,john@example.com,,`

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0].jobTitle).toBeUndefined()
    expect(result[0].countryCode).toBeUndefined()
    expect(result[0].isValid).toBe(true)
  })

  it('should discard invalid country codes without blocking import, but warn about them', () => {
    const csv = `firstName,lastName,email,countryCode
John,Doe,john@example.com,XXX
Jane,Smith,jane@example.com,12
Bob,Jones,bob@example.com,usa`

    const result = parseCsv(csv)

    expect(result).toHaveLength(3)
    result.forEach((lead) => {
      expect(lead.countryCode).toBeUndefined()
      expect(lead.isValid).toBe(true)
      expect(lead.errors).toHaveLength(0)
      expect(lead.warnings).toHaveLength(1)
      expect(lead.warnings[0]).toMatch(/Invalid country code/)
    })
  })

  it('should not warn when country code is a valid 2-letter code or omitted', () => {
    const csv = `firstName,lastName,email,countryCode
John,Doe,john@example.com,US
Jane,Smith,jane@example.com,`

    const result = parseCsv(csv)

    expect(result).toHaveLength(2)
    result.forEach((lead) => {
      expect(lead.warnings).toHaveLength(0)
    })
  })

  it('should parse phoneNumber, yearsInRole, and linkedin columns', () => {
    const csv = `firstName,lastName,email,phoneNumber,yearsInRole,linkedin
John,Doe,john@example.com,+1-555-0100,3,linkedin.com/in/johndoe`

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0].phoneNumber).toBe('+1-555-0100')
    expect(result[0].yearsAtCompany).toBe(3)
    expect(result[0].linkedin).toBe('https://linkedin.com/in/johndoe')
    expect(result[0].isValid).toBe(true)
    expect(result[0].warnings).toHaveLength(0)
  })

  it('should also accept the yearsAtCompany header spelling', () => {
    const csv = `firstName,lastName,email,yearsAtCompany
John,Doe,john@example.com,5`

    const result = parseCsv(csv)

    expect(result[0].yearsAtCompany).toBe(5)
  })

  it('should discard an invalid years value without blocking import, but warn about it', () => {
    const csv = `firstName,lastName,email,yearsInRole
John,Doe,john@example.com,five`

    const result = parseCsv(csv)

    expect(result[0].yearsAtCompany).toBeUndefined()
    expect(result[0].isValid).toBe(true)
    expect(result[0].warnings).toHaveLength(1)
    expect(result[0].warnings[0]).toMatch(/Invalid years at company/)
  })

  it('should discard a non-linkedin URL without blocking import, but warn about it', () => {
    const csv = `firstName,lastName,email,linkedin
John,Doe,john@example.com,https://twitter.com/johndoe`

    const result = parseCsv(csv)

    expect(result[0].linkedin).toBeUndefined()
    expect(result[0].isValid).toBe(true)
    expect(result[0].warnings).toHaveLength(1)
    expect(result[0].warnings[0]).toMatch(/Invalid LinkedIn URL/)
  })

  it('should preserve row index correctly', () => {
    const csv = `firstName,lastName,email
John,Doe,john@example.com
Jane,Smith,jane@example.com
Bob,Johnson,bob@example.com`

    const result = parseCsv(csv)

    expect(result).toHaveLength(3)
    expect(result[0].rowIndex).toBe(2)
    expect(result[1].rowIndex).toBe(3)
    expect(result[2].rowIndex).toBe(4)
  })

  it('should handle multiple validation errors per lead', () => {
    const csv = `firstName,lastName,email
 , ,invalid-email`

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0].isValid).toBe(false)
    expect(result[0].errors).toHaveLength(3)
    expect(result[0].errors).toContain('First name is required')
    expect(result[0].errors).toContain('Last name is required')
    expect(result[0].errors).toContain('Invalid email format')
  })

  it('should handle extra columns not in header mapping', () => {
    const csv = `firstName,lastName,email,unknownColumn
John,Doe,john@example.com,someValue`

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0].firstName).toBe('John')
    expect(result[0].lastName).toBe('Doe')
    expect(result[0].email).toBe('john@example.com')
    expect(result[0].isValid).toBe(true)
  })

  it('should handle mixed valid and invalid leads', () => {
    const csv = `firstName,lastName,email
John,Doe,john@example.com
,Smith,invalid-email
Jane,Johnson,jane@example.com`

    const result = parseCsv(csv)

    expect(result).toHaveLength(3)
    expect(result[0].isValid).toBe(true)
    expect(result[1].isValid).toBe(false)
    expect(result[1].errors).toContain('First name is required')
    expect(result[1].errors).toContain('Invalid email format')
    expect(result[2].isValid).toBe(true)
  })

  it('should handle whitespace in fields', () => {
    const csv = `firstName,lastName,email
 John , Doe , john@example.com `

    const result = parseCsv(csv)

    expect(result).toHaveLength(1)
    expect(result[0].firstName).toBe('John')
    expect(result[0].lastName).toBe('Doe')
    expect(result[0].email).toBe('john@example.com')
    expect(result[0].isValid).toBe(true)
  })
})
