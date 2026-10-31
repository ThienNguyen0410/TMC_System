import type { UserRole } from '../types/auth'

export interface AuthApiUser {
  id: string
  username: string
  role: UserRole
}

interface AuthApiErrorPayload {
  error?: {
    message?: string
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null
  }

  const error = (payload as AuthApiErrorPayload).error
  return typeof error?.message === 'string' ? error.message : null
}

function readUser(payload: unknown): AuthApiUser | null {
  if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.user)) {
    return null
  }

  const user = payload.data.user
  if (
    typeof user.id !== 'string' ||
    typeof user.username !== 'string' ||
    (user.role !== 'employee' && user.role !== 'admin')
  ) {
    return null
  }

  return { id: user.id, username: user.username, role: user.role }
}

export async function loginWithPassword(
  username: string,
  password: string,
): Promise<AuthApiUser> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    throw new Error('Unable to connect to the authentication server.')
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(readErrorMessage(payload) ?? 'Invalid username or password. Please try again.')
  }

  const user = readUser(payload)
  if (!user) {
    throw new Error('The authentication server returned an invalid response.')
  }

  return user
}
