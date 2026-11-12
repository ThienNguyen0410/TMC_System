import assert from 'node:assert/strict'
import { test } from 'node:test'
import express from 'express'
import { ConflictError } from '../../../shared/errors/app-error.ts'
import { signAccessToken } from '../../../shared/security/tokens.ts'
import { withServer } from '../../../shared/testing/with-server.ts'
import type { AuthUser, UpdateProfileInput, UserRole } from '../../user/domain/auth-user.ts'
import type { AuthRepository } from '../../user/repository/auth.repository.ts'
import type { UserRepository } from '../../user/repository/user.repository.ts'
import { AuthService } from '../../user/service/auth.service.ts'
import { UserService } from '../../user/service/user.service.ts'
import { requireRole } from '../middleware/require-role.ts'
import { createUserRouter } from '../routes/user.routes.ts'
import { UserController } from './user.ts'

interface ListBody {
  data: { users: AuthUser[] }
}
interface UpdateBody {
  data: { user: AuthUser }
}
interface ErrorBody {
  error: { code: string }
}

const SECRET = 'test-secret'

const user = (id: string, username: string, role: UserRole): AuthUser => ({
  id,
  username,
  role,
  fullName: `User ${id}`,
  email: `${username}@example.com`,
  phone: '0901234567',
  dateOfBirth: '2003-05-15',
  department: 'IT',
})

const seedUsers = () => [
  user('1', 'admin01', 'admin'),
  user('2', 'employee01', 'employee'),
  user('3', 'employee02', 'employee'),
]

// Only findUserById is reached by requireAuth; the stored role is the one that counts.
const accounts = new Map([
  ['1', user('1', 'admin01', 'admin')],
  ['2', user('2', 'employee01', 'employee')],
])
const authService = new AuthService(
  { findUserById: async (id: string) => accounts.get(id) ?? null } as unknown as AuthRepository,
  {
    accessTokenSecret: SECRET,
    accessTokenTtlSeconds: 60,
    refreshTokenTtlDays: 7,
    appBaseUrl: 'http://localhost:5173',
    passwordResetTtlMinutes: 30,
  },
  { sendPasswordReset: async () => undefined },
)

const tokenFor = (id: string, role: UserRole) =>
  signAccessToken({ id, username: `user${id}`, role }, SECRET, 60)

const asAdmin = async () => ({ Authorization: `Bearer ${await tokenFor('1', 'admin')}` })
const asEmployee = async () => ({ Authorization: `Bearer ${await tokenFor('2', 'employee')}` })

// The update path is the only one that mutates, so the fake keeps that logic local.
class InMemoryUserRepository implements UserRepository {
  users: AuthUser[]
  updates: Array<{ id: string; input: UpdateProfileInput }> = []
  deactivated = new Set<string>()

  constructor(users: AuthUser[]) {
    this.users = users
  }

  // Mirrors Postgres: deactivated accounts are invisible to reads.
  async findUserById(id: string): Promise<AuthUser | null> {
    if (this.deactivated.has(id)) {
      return null
    }

    return this.users.find((candidate) => candidate.id === id) ?? null
  }

  async listUsers(): Promise<AuthUser[]> {
    return this.users.filter((account) => !this.deactivated.has(account.id))
  }

  async deactivateUser(id: string): Promise<AuthUser | null> {
    const current = await this.findUserById(id)

    if (!current) {
      return null
    }

    this.deactivated.add(id)
    return current
  }

  async updateUserProfile(id: string, input: UpdateProfileInput): Promise<AuthUser | null> {
    const current = this.users.find((candidate) => candidate.id === id)

    if (!current) {
      return null
    }

    const taken = this.users.some(
      (candidate) =>
        candidate.id !== id && candidate.email?.toLowerCase() === input.email.toLowerCase(),
    )

    if (taken) {
      throw new ConflictError('That email address is already used by another account.')
    }

    this.updates.push({ id, input })
    const updated: AuthUser = { ...current, ...input }
    this.users = this.users.map((candidate) => (candidate.id === id ? updated : candidate))

    return updated
  }
}

const serve = (run: (baseUrl: string, repository: InMemoryUserRepository) => Promise<void>) => {
  const repository = new InMemoryUserRepository(seedUsers())
  const controller = new UserController(new UserService(repository))

  return withServer(
    (app) => {
      app.use(express.json())
      app.use('/api/users', createUserRouter(controller, authService, requireRole('admin')))
    },
    (baseUrl) => run(baseUrl, repository),
  )
}

const validProfile = {
  fullName: 'Nguyen Van An',
  email: 'an.nguyen@example.com',
  phone: '0912345678',
  department: 'Engineering',
  dateOfBirth: '2003-05-15',
}

const putProfile = (baseUrl: string, id: string, body: unknown, headers: Record<string, string>) =>
  fetch(`${baseUrl}/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

const deleteAccount = (baseUrl: string, id: string, headers: Record<string, string> = {}) =>
  fetch(`${baseUrl}/api/users/${id}`, { method: 'DELETE', headers })

test('GET /api/users returns every account to an admin', () =>
  serve(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/users`, { headers: await asAdmin() })
    const body = (await response.json()) as ListBody

    assert.equal(response.status, 200)
    assert.deepEqual(
      body.data.users.map((account) => [account.id, account.username, account.role]),
      [
        ['1', 'admin01', 'admin'],
        ['2', 'employee01', 'employee'],
        ['3', 'employee02', 'employee'],
      ],
    )
    assert.equal(body.data.users[0].email, 'admin01@example.com')
  }))

test('GET /api/users rejects a non-admin', () =>
  serve(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/users`, { headers: await asEmployee() })
    const body = (await response.json()) as ErrorBody

    assert.equal(response.status, 403)
    assert.equal(body.error.code, 'FORBIDDEN')
  }))

test('GET /api/users requires a token', () =>
  serve(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/users`)
    const body = (await response.json()) as ErrorBody

    assert.equal(response.status, 401)
    assert.equal(body.error.code, 'INVALID_CREDENTIALS')
  }))

test('PUT /api/users/:id updates the editable profile only', () =>
  serve(async (baseUrl, repository) => {
    const response = await putProfile(
      baseUrl,
      '2',
      { ...validProfile, fullName: '  Nguyen Van An  ', email: 'AN.Nguyen@Example.com' },
      await asAdmin(),
    )
    const body = (await response.json()) as UpdateBody

    assert.equal(response.status, 200)
    assert.equal(body.data.user.fullName, 'Nguyen Van An')
    assert.equal(body.data.user.email, 'an.nguyen@example.com')
    assert.equal(body.data.user.phone, '0912345678')
    assert.equal(body.data.user.department, 'Engineering')
    assert.equal(body.data.user.dateOfBirth, '2003-05-15')
    assert.equal(body.data.user.username, 'employee01')
    assert.equal(body.data.user.role, 'employee')
    assert.deepEqual(repository.updates, [
      { id: '2', input: { ...validProfile, email: 'an.nguyen@example.com' } },
    ])
  }))

test('PUT /api/users/:id rejects a non-admin', () =>
  serve(async (baseUrl) => {
    const response = await putProfile(baseUrl, '3', validProfile, await asEmployee())

    assert.equal(response.status, 403)
  }))

test('PUT /api/users/:id validates the body', () =>
  serve(async (baseUrl) => {
    const headers = await asAdmin()
    const cases = [
      { ...validProfile, phone: '12345' },
      { ...validProfile, email: 'not-an-email' },
      { ...validProfile, dateOfBirth: '2999-01-01' },
      { ...validProfile, department: 'x'.repeat(101) },
      { ...validProfile, fullName: 'A' },
    ]

    for (const body of cases) {
      const response = await putProfile(baseUrl, '2', body, headers)

      assert.equal(response.status, 400, JSON.stringify(body))
    }
  }))

test('PUT /api/users/:id rejects an id that is not a database key', () =>
  serve(async (baseUrl) => {
    const response = await putProfile(baseUrl, 'EMP-0001', validProfile, await asAdmin())
    const body = (await response.json()) as ErrorBody

    assert.equal(response.status, 400)
    assert.equal(body.error.code, 'VALIDATION_ERROR')
  }))

test('PUT /api/users/:id reports an unknown account', () =>
  serve(async (baseUrl) => {
    const response = await putProfile(baseUrl, '999999', validProfile, await asAdmin())
    const body = (await response.json()) as ErrorBody

    assert.equal(response.status, 404)
    assert.equal(body.error.code, 'NOT_FOUND')
  }))

test('PUT /api/users/:id reports a duplicate email', () =>
  serve(async (baseUrl) => {
    const response = await putProfile(
      baseUrl,
      '3',
      { ...validProfile, email: 'employee01@example.com' },
      await asAdmin(),
    )
    const body = (await response.json()) as ErrorBody

    assert.equal(response.status, 409)
    assert.equal(body.error.code, 'CONFLICT')
  }))

test('DELETE /api/users/:id deactivates an employee and drops them from the list', () =>
  serve(async (baseUrl, repository) => {
    const response = await deleteAccount(baseUrl, '2', await asAdmin())

    assert.equal(response.status, 204)
    assert.equal(await response.text(), '')
    assert.deepEqual([...repository.deactivated], ['2'])

    const list = await fetch(`${baseUrl}/api/users`, { headers: await asAdmin() })
    const body = (await list.json()) as ListBody

    assert.deepEqual(
      body.data.users.map((account) => account.id),
      ['1', '3'],
    )
  }))

test('DELETE /api/users/:id requires a token', () =>
  serve(async (baseUrl) => {
    const response = await deleteAccount(baseUrl, '2')
    const body = (await response.json()) as ErrorBody

    assert.equal(response.status, 401)
    assert.equal(body.error.code, 'INVALID_CREDENTIALS')
  }))

test('DELETE /api/users/:id rejects a non-admin', () =>
  serve(async (baseUrl) => {
    const response = await deleteAccount(baseUrl, '3', await asEmployee())

    assert.equal(response.status, 403)
  }))

test('DELETE /api/users/:id rejects an id that is not a database key', () =>
  serve(async (baseUrl, repository) => {
    const response = await deleteAccount(baseUrl, 'EMP-0001', await asAdmin())
    const body = (await response.json()) as ErrorBody

    assert.equal(response.status, 400)
    assert.equal(body.error.code, 'VALIDATION_ERROR')
    assert.equal(repository.deactivated.size, 0)
  }))

test('DELETE /api/users/:id reports an unknown account', () =>
  serve(async (baseUrl) => {
    const response = await deleteAccount(baseUrl, '999999', await asAdmin())
    const body = (await response.json()) as ErrorBody

    assert.equal(response.status, 404)
    assert.equal(body.error.code, 'NOT_FOUND')
  }))

test('DELETE /api/users/:id reports an already deleted account', () =>
  serve(async (baseUrl) => {
    const headers = await asAdmin()

    assert.equal((await deleteAccount(baseUrl, '2', headers)).status, 204)

    const repeat = await deleteAccount(baseUrl, '2', headers)
    const body = (await repeat.json()) as ErrorBody

    assert.equal(repeat.status, 404)
    assert.equal(body.error.code, 'NOT_FOUND')
  }))

test('DELETE /api/users/:id refuses an administrator account', () =>
  serve(async (baseUrl, repository) => {
    const response = await deleteAccount(baseUrl, '1', await asAdmin())
    const body = (await response.json()) as ErrorBody

    assert.equal(response.status, 409)
    assert.equal(body.error.code, 'CONFLICT')
    assert.equal(repository.deactivated.size, 0)
  }))
