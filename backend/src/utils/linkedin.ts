export const normalizeLinkedin = (value: string | undefined | null): string | undefined => {
  if (!value || typeof value !== 'string') return undefined
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

export const linkedinWarning = (value: string | undefined | null): string | undefined => {
  if (!value || typeof value !== 'string' || !value.trim() || normalizeLinkedin(value)) return undefined
  return `Invalid LinkedIn URL "${value.trim()}" - must be a linkedin.com link, field cleared`
}
