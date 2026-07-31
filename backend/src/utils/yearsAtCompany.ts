export const normalizeYearsAtCompany = (value: string | number | undefined | null): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const num = typeof value === 'number' ? value : Number(value.trim())
  return Number.isInteger(num) && num >= 0 && num <= 100 ? num : undefined
}

export const yearsAtCompanyWarning = (value: string | number | undefined | null): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  if (normalizeYearsAtCompany(value) !== undefined) return undefined
  return `Invalid years at company "${value}" - must be a whole number between 0 and 100, field cleared`
}
