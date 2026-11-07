import type { UserRole } from '../types/auth'
import { API_BASE_URL, isRecord, readErrorMessage } from './api-utils'

export interface AuthApiUser {
  id: string
  username: string
  role: UserRole
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
