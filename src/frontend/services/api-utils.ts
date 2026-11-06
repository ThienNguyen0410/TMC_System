interface ApiErrorPayload {
  error?: {
    message?: string
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null
  }

  const error = (payload as ApiErrorPayload).error
  return typeof error?.message === 'string' ? error.message : null
}
