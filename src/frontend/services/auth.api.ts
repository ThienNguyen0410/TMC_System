import type { AccountRole, RegisterInput } from '../types/auth'

export interface AuthApiUser {
  id: string
  username: string
  role: AccountRole
}

interface AuthApiErrorPayload {
  error?: {
    message?: string
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const accountRoles: readonly AccountRole[] = [
  'employee',
  'production_supervisor',
  'hr',
  'security_guard',
  'admin',
  'executive_management',
]

// The access token stays in memory only; the refresh token is the httpOnly cookie.
let accessToken: string | null = null
// React StrictMode mounts twice in dev; two concurrent rotations would revoke each other.
let pendingRefresh: Promise<AuthApiUser | null> | null = null

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
    !accountRoles.includes(user.role as AccountRole)
  ) {
    return null
  }

  return { id: user.id, username: user.username, role: user.role as AccountRole }
}

function readSession(payload: unknown): { user: AuthApiUser; accessToken: string } {
  const user = readUser(payload)
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : null

  if (!user || typeof data?.accessToken !== 'string') {
    throw new Error('The authentication server returned an invalid response.')
  }

  return { user, accessToken: data.accessToken }
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/api/auth${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    })
  } catch {
    throw new Error('Unable to connect to the authentication server.')
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(readErrorMessage(payload) ?? 'The authentication server rejected the request.')
  }

  return payload
}

export async function loginWithPassword(
  username: string,
  password: string,
): Promise<AuthApiUser> {
  const session = readSession(
    await request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  )

  accessToken = session.accessToken
  return session.user
}

export async function registerAccount(input: RegisterInput): Promise<void> {
  await request('/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function refreshSession(): Promise<AuthApiUser | null> {
  pendingRefresh ??= request('/refresh', { method: 'POST' })
    .then((payload) => {
      const session = readSession(payload)
      accessToken = session.accessToken
      return session.user
    })
    .catch(() => null)
    .finally(() => {
      pendingRefresh = null
    })

  return pendingRefresh
}

export async function logoutSession(): Promise<void> {
  accessToken = null
  await request('/logout', { method: 'POST' }).catch(() => undefined)
}
