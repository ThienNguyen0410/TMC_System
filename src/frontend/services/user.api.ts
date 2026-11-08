import type { AccountRole } from '../types/auth'
import { authorizedFetch, isRecord, readErrorMessage, readNullableString } from './auth.api'

// A row of GET /api/users.
export interface ManagedUser {
  id: string
  username: string
  role: AccountRole
  fullName: string
  email: string | null
  phone: string | null
  dateOfBirth: string | null
  department: string | null
}

export interface UpdateUserProfileInput {
  fullName: string
  email: string
  phone: string
  department: string
  dateOfBirth: string
}

const accountRoles: readonly AccountRole[] = [
  'employee',
  'production_supervisor',
  'hr',
  'security_guard',
  'admin',
  'executive_management',
]

function readUser(value: unknown): ManagedUser | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.username !== 'string' ||
    typeof value.fullName !== 'string' ||
    !accountRoles.includes(value.role as AccountRole)
  ) {
    return null
  }

  return {
    id: value.id,
    username: value.username,
    role: value.role as AccountRole,
    fullName: value.fullName,
    email: readNullableString(value.email),
    phone: readNullableString(value.phone),
    dateOfBirth: readNullableString(value.dateOfBirth),
    department: readNullableString(value.department),
  }
}

async function requestUsers(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response

  try {
    response = await authorizedFetch(path, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new Error('Unable to connect to the server.')
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(readErrorMessage(payload) ?? 'The account request failed. Please try again.')
  }

  return payload
}

export async function fetchUsers(signal?: AbortSignal): Promise<ManagedUser[]> {
  const payload = await requestUsers('/api/users', { signal })

  if (!isRecord(payload) || !isRecord(payload.data) || !Array.isArray(payload.data.users)) {
    throw new Error('The server returned an invalid account list.')
  }

  const users = payload.data.users.map(readUser)

  if (users.some((user) => user === null)) {
    throw new Error('The server returned an invalid account list.')
  }

  return users as ManagedUser[]
}

export async function updateUserProfile(
  id: string,
  input: UpdateUserProfileInput,
): Promise<ManagedUser> {
  const payload = await requestUsers(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const user =
    isRecord(payload) && isRecord(payload.data) ? readUser(payload.data.user) : null

  if (!user) {
    throw new Error('The server returned an invalid account.')
  }

  return user
}
