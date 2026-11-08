import type { AccountRole, RegisterInput } from '../types/auth'

export interface AuthApiUser {
  id: string
  username: string
  role: AccountRole
  fullName: string
  email: string | null
  phone: string | null
  dateOfBirth: string | null
  department: string | null
}

interface AuthApiErrorPayload {
  error?: {
    message?: string
  }
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null
  }

  const error = (payload as AuthApiErrorPayload).error
  return typeof error?.message === 'string' ? error.message : null
}

export function readNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function readUser(payload: unknown): AuthApiUser | null {
  if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.user)) {
    return null
  }

  const user = payload.data.user
  if (
    typeof user.id !== 'string' ||
    typeof user.username !== 'string' ||
    typeof user.fullName !== 'string' ||
    !accountRoles.includes(user.role as AccountRole)
  ) {
    return null
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role as AccountRole,
    fullName: user.fullName,
    email: readNullableString(user.email),
    phone: readNullableString(user.phone),
    dateOfBirth: readNullableString(user.dateOfBirth),
    department: readNullableString(user.department),
  }
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

// Always answers 202, whether or not the address belongs to an account.
export async function requestPasswordReset(email: string): Promise<void> {
  await request('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await request('/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

// For endpoints that need the access token. An expired token gets one refresh and one retry.
export async function authorizedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const send = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    })

  const response = await send()
  return response.status === 401 && (await refreshSession()) ? send() : response
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
