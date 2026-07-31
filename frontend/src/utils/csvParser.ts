import Papa from 'papaparse'

export interface CsvLead {
  firstName: string
  lastName: string
  email: string
  jobTitle?: string
  countryCode?: string
  companyName?: string
  phoneNumber?: string
  yearsAtCompany?: number
  linkedin?: string
  isValid: boolean
  errors: string[]
  warnings: string[]
  rowIndex: number
}

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const normalizeCountryCode = (value: string | undefined): string | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  return /^[A-Za-z]{2}$/.test(trimmed) ? trimmed.toUpperCase() : undefined
}

export const countryCodeWarning = (rawValue: string): string | undefined => {
  if (!rawValue || normalizeCountryCode(rawValue)) return undefined
  return `Invalid country code "${rawValue}" - must be exactly 2 letters, field cleared`
}

export const normalizeYearsAtCompany = (value: string | undefined): number | undefined => {
  if (!value) return undefined
  const num = Number(value.trim())
  return Number.isInteger(num) && num >= 0 && num <= 100 ? num : undefined
}

export const yearsAtCompanyWarning = (rawValue: string): string | undefined => {
  if (!rawValue || normalizeYearsAtCompany(rawValue) !== undefined) return undefined
  return `Invalid years at company "${rawValue}" - must be a whole number between 0 and 100, field cleared`
}

export const normalizeLinkedin = (value: string | undefined): string | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    return hostname === 'linkedin.com' ? candidate : undefined
  } catch {
    return undefined
  }
}

export const linkedinWarning = (rawValue: string): string | undefined => {
  if (!rawValue || normalizeLinkedin(rawValue)) return undefined
  return `Invalid LinkedIn URL "${rawValue}" - must be a linkedin.com link, field cleared`
}

export const parseCsv = (content: string): CsvLead[] => {
  if (!content?.trim()) {
    throw new Error('CSV content cannot be empty')
  }

  const parseResult = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value.trim(),
    transformHeader: (header) => header.trim().toLowerCase(),
    quoteChar: '"',
  })

  if (parseResult.errors.length > 0) {
    const criticalErrors = parseResult.errors.filter(
      (error) => error.type === 'Delimiter' || error.type === 'Quotes' || error.type === 'FieldMismatch'
    )
    if (criticalErrors.length > 0) {
      throw new Error(`CSV parsing failed: ${criticalErrors[0].message}`)
    }
  }

  if (!parseResult.data || parseResult.data.length === 0) {
    throw new Error('CSV file appears to be empty or contains no valid data')
  }

  const data: CsvLead[] = []

  parseResult.data.forEach((row, index) => {
    if (Object.values(row).every((value) => !value)) return

    const lead: Partial<CsvLead> = { rowIndex: index + 2 }
    const warnings: string[] = []

    Object.entries(row).forEach(([header, value]) => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z]/g, '')
      const trimmedValue = value?.trim() || ''

      switch (normalizedHeader) {
        case 'firstname':
          lead.firstName = trimmedValue
          break
        case 'lastname':
          lead.lastName = trimmedValue
          break
        case 'email':
          lead.email = trimmedValue
          break
        case 'jobtitle':
          lead.jobTitle = trimmedValue || undefined
          break
        case 'countrycode': {
          lead.countryCode = normalizeCountryCode(trimmedValue)
          const warning = countryCodeWarning(trimmedValue)
          if (warning) warnings.push(warning)
          break
        }
        case 'companyname':
          lead.companyName = trimmedValue || undefined
          break
        case 'phonenumber':
        case 'phone':
          lead.phoneNumber = trimmedValue || undefined
          break
        case 'yearsinrole':
        case 'yearsatcompany':
        case 'years': {
          lead.yearsAtCompany = normalizeYearsAtCompany(trimmedValue)
          const warning = yearsAtCompanyWarning(trimmedValue)
          if (warning) warnings.push(warning)
          break
        }
        case 'linkedin':
        case 'linkedinurl':
        case 'linkedinprofile': {
          lead.linkedin = normalizeLinkedin(trimmedValue)
          const warning = linkedinWarning(trimmedValue)
          if (warning) warnings.push(warning)
          break
        }
      }
    })

    const errors: string[] = []
    if (!lead.firstName?.trim()) {
      errors.push('First name is required')
    }
    if (!lead.lastName?.trim()) {
      errors.push('Last name is required')
    }
    if (!lead.email?.trim()) {
      errors.push('Email is required')
    } else if (!isValidEmail(lead.email)) {
      errors.push('Invalid email format')
    }

    data.push({
      ...lead,
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      email: lead.email || '',
      isValid: errors.length === 0,
      errors,
      warnings,
    } as CsvLead)
  })

  return data
}
