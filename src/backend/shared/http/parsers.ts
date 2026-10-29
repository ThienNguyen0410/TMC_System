import { ValidationError } from '../errors/app-error.ts'

export const asObject = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError('Request body must be a JSON object')
  }
  return value as Record<string, unknown>
}

export const readRequiredString = (source: Record<string, unknown>, field: string): string => {
  const value = source[field]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${field} is required`)
  }
  return value.trim()
}

export const readOptionalString = (
  source: Record<string, unknown>,
  field: string,
): string | undefined => {
  const value = source[field]
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`)
  }
  return value
}
