export const normalizeCountryCode = (value: string | undefined | null): string | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  return /^[A-Za-z]{2}$/.test(trimmed) ? trimmed.toUpperCase() : undefined
}

export const countryCodeWarning = (value: string | undefined | null): string | undefined => {
  if (!value || typeof value !== 'string' || !value.trim() || normalizeCountryCode(value)) return undefined
  return `Invalid country code "${value.trim()}" - must be exactly 2 letters, field cleared`
}
