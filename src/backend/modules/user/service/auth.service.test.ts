import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AuthenticationError, ConflictError } from '../../../shared/errors/app-error.ts'
import { hashPassword, verifyPassword } from '../../../shared/security/password.ts'
import { hashToken, verifyAccessToken } from '../../../shared/security/tokens.ts'
import type { AuthAccount, AuthUser, RegisterInput } from '../domain/auth-user.ts'
import type {
  AuthCredentials,
  AuthRepository,
  NewAccount,
  NewRefreshToken,
  RefreshTokenRecord,
} from '../repository/auth.repository.ts'
import { AuthService } from './auth.service.ts'

const config = {
  accessTokenSecret: 'test-secret',
  accessTokenTtlSeconds: 60,
  refreshTokenTtlDays: 7,
}

const registerInput: RegisterInput = {
  fullName: 'Nguyen Van An',
  username: 'employee09',
  password: 'Secret123!',
  email: 'employee09@example.com',
  phone: '0901234567',
  dateOfBirth: '2003-05-15',
}

class FakeAuthRepository implements AuthRepository {
  credentials: AuthCredentials | null = null
  users = new Map<string, AuthUser>()
  tokens: Array<RefreshTokenRecord & { tokenHash: string }> = []
  created: NewAccount | null = null
  private nextId = 1

  async findByUsername(username: string): Promise<AuthCredentials | null> {
    return this.credentials?.username === username ? this.credentials : null
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    return this.users.get(id) ?? null
  }

  async createAccount(account: NewAccount): Promise<AuthAccount> {
    this.created = account
    return { id: '9', username: account.username }
  }

  async createRefreshToken(token: NewRefreshToken): Promise<void> {
    this.tokens.push({
      id: String(this.nextId++),
      userId: token.userId,
      expiresAt: token.expiresAt,
      revokedAt: null,
      tokenHash: token.tokenHash,
    })
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.tokens.find((token) => token.tokenHash === tokenHash) ?? null
  }

  async rotateRefreshToken(currentId: string, next: NewRefreshToken): Promise<boolean> {
    const current = this.tokens.find(
      (token) => token.id === currentId && !token.revokedAt && token.expiresAt > new Date(),
    )

    if (!current) {
      return false
    }

    current.revokedAt = new Date()
    await this.createRefreshToken(next)
    return true
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    const token = this.tokens.find((candidate) => candidate.tokenHash === tokenHash)

    if (token) {
      token.revokedAt = new Date()
    }
  }
}

const setup = async (overrides: Partial<AuthCredentials> = {}) => {
  const repository = new FakeAuthRepository()
  const passwordHash = await hashPassword('Secret123!')
  const credentials: AuthCredentials = {
    id: '1',
    username: 'employee01',
    passwordHash,
    role: 'employee',
    isActive: true,
    ...overrides,
  }

  repository.credentials = credentials
  repository.users.set(credentials.id, {
    id: credentials.id,
    username: credentials.username,
    role: credentials.role,
  })

  return { repository, service: new AuthService(repository, config) }
}

test('logs in with a valid password and issues both tokens', async () => {
  const { repository, service } = await setup()

  const session = await service.login(' Employee01 ', 'Secret123!')

  assert.deepEqual(session.user, { id: '1', username: 'employee01', role: 'employee' })
  assert.deepEqual(await verifyAccessToken(session.accessToken, config.accessTokenSecret), session.user)
  assert.equal(repository.tokens.length, 1)
  assert.equal(repository.tokens[0].tokenHash, hashToken(session.refreshToken))
  assert.equal(repository.tokens[0].revokedAt, null)
})

test('rejects unknown, inactive and wrong-password logins', async () => {
  const wrongPassword = await setup()
  await assert.rejects(
    wrongPassword.service.login('employee01', 'Wrong123!'),
    AuthenticationError,
  )

  const unknown = await setup()
  await assert.rejects(unknown.service.login('nobody', 'Secret123!'), AuthenticationError)

  const inactive = await setup({ isActive: false })
  await assert.rejects(inactive.service.login('employee01', 'Secret123!'), AuthenticationError)
})

test('rotates the refresh token and rejects the used one', async () => {
  const { repository, service } = await setup()
  const first = await service.login('employee01', 'Secret123!')

  const second = await service.refresh(first.refreshToken)

  assert.notEqual(second.refreshToken, first.refreshToken)
  assert.deepEqual(await verifyAccessToken(second.accessToken, config.accessTokenSecret), second.user)
  assert.ok(repository.tokens[0].revokedAt)
  assert.equal(repository.tokens.length, 2)

  await assert.rejects(service.refresh(first.refreshToken), AuthenticationError)
})

test('rejects an access token after its user is no longer available', async () => {
  const { repository, service } = await setup()
  const session = await service.login('employee01', 'Secret123!')

  repository.users.delete('1')

  assert.equal(await service.authenticateAccessToken(session.accessToken), null)
})

test('rejects an expired refresh token', async () => {
  const { repository, service } = await setup()
  const session = await service.login('employee01', 'Secret123!')
  repository.tokens[0].expiresAt = new Date(Date.now() - 1000)

  await assert.rejects(service.refresh(session.refreshToken), AuthenticationError)
})

test('logout revokes the refresh token', async () => {
  const { service } = await setup()
  const session = await service.login('employee01', 'Secret123!')

  await service.logout(session.refreshToken)

  await assert.rejects(service.refresh(session.refreshToken), AuthenticationError)
})

test('hashes the password in the seeded scrypt format and delegates the account', async () => {
  const { repository, service } = await setup()

  const user = await service.register(registerInput)

  assert.deepEqual(user, { id: '9', username: 'employee09', role: 'employee' })
  assert.ok(repository.created)
  assert.equal(repository.created.username, 'employee09')
  assert.equal(await verifyPassword(registerInput.password, repository.created.passwordHash), true)
})

test('propagates repository conflicts', async () => {
  const { repository, service } = await setup()
  repository.createAccount = async () => {
    throw new ConflictError('Username or email is already registered.')
  }

  await assert.rejects(service.register(registerInput), ConflictError)
})
