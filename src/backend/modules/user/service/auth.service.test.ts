import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AuthenticationError, ConflictError, ValidationError } from '../../../shared/errors/app-error.ts'
import { hashPassword, verifyPassword } from '../../../shared/security/password.ts'
import { hashToken, verifyAccessToken } from '../../../shared/security/tokens.ts'
import type { AuthAccount, AuthUser, RegisterInput } from '../domain/auth-user.ts'
import type { PasswordResetMailer } from '../mailer/password-reset-mailer.ts'
import type {
  AuthCredentials,
  AuthRepository,
  NewAccount,
  NewPasswordReset,
  NewRefreshToken,
  PasswordResetRecord,
  RefreshTokenRecord,
} from '../repository/auth.repository.ts'
import { AuthService } from './auth.service.ts'

const config = {
  accessTokenSecret: 'test-secret',
  accessTokenTtlSeconds: 60,
  refreshTokenTtlDays: 7,
  appBaseUrl: 'http://localhost:5173',
  passwordResetTtlMinutes: 30,
}

const registerInput: RegisterInput = {
  fullName: 'Nguyen Van An',
  username: 'employee09',
  password: 'Secret123!',
  email: 'employee09@example.com',
  phone: '0901234567',
  dateOfBirth: '2003-05-15',
  role: 'production_supervisor',
}

class FakeAuthRepository implements AuthRepository {
  credentials: AuthCredentials | null = null
  users = new Map<string, AuthUser>()
  tokens: Array<RefreshTokenRecord & { tokenHash: string }> = []
  resets: Array<PasswordResetRecord & { tokenHash: string }> = []
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

  async findActiveUserIdByEmail(email: string): Promise<string | null> {
    const account = this.credentials

    return account && account.isActive && account.email?.toLowerCase() === email ? account.id : null
  }

  async createPasswordReset(reset: NewPasswordReset): Promise<void> {
    for (const existing of this.resets) {
      if (existing.userId === reset.userId && !existing.usedAt) {
        existing.usedAt = new Date()
      }
    }

    this.resets.push({ id: String(this.nextId++), usedAt: null, ...reset })
  }

  async findPasswordReset(tokenHash: string): Promise<PasswordResetRecord | null> {
    return this.resets.find((reset) => reset.tokenHash === tokenHash) ?? null
  }

  async consumePasswordReset(resetId: string, passwordHash: string): Promise<boolean> {
    const reset = this.resets.find(
      (candidate) => candidate.id === resetId && !candidate.usedAt && candidate.expiresAt > new Date(),
    )

    if (!reset) {
      return false
    }

    reset.usedAt = new Date()

    if (this.credentials) {
      this.credentials.passwordHash = passwordHash
    }

    for (const token of this.tokens) {
      token.revokedAt ??= new Date()
    }

    return true
  }
}

class FakePasswordResetMailer implements PasswordResetMailer {
  sent: Array<{ to: string; link: string; ttlMinutes: number }> = []
  fail = false

  async sendPasswordReset(to: string, link: string, ttlMinutes: number): Promise<void> {
    if (this.fail) {
      throw new Error('SMTP unreachable')
    }

    this.sent.push({ to, link, ttlMinutes })
  }
}

const setup = async (overrides: Partial<AuthCredentials> = {}) => {
  const repository = new FakeAuthRepository()
  const mailer = new FakePasswordResetMailer()
  const passwordHash = await hashPassword('Secret123!')
  const credentials: AuthCredentials = {
    id: '1',
    username: 'employee01',
    passwordHash,
    role: 'employee',
    isActive: true,
    fullName: 'Nguyen Van An',
    email: 'employee01@example.com',
    phone: '0901234567',
    dateOfBirth: '2003-05-15',
    department: 'Engineering',
    ...overrides,
  }

  repository.credentials = credentials
  repository.users.set(credentials.id, {
    id: credentials.id,
    username: credentials.username,
    role: credentials.role,
    fullName: credentials.fullName,
    email: credentials.email,
    phone: credentials.phone,
    dateOfBirth: credentials.dateOfBirth,
    department: credentials.department,
  })

  return { repository, mailer, service: new AuthService(repository, config, mailer) }
}

test('logs in with a valid password and issues both tokens', async () => {
  const { repository, service } = await setup()

  const session = await service.login(' Employee01 ', 'Secret123!')

  assert.deepEqual(session.user, {
    id: '1',
    username: 'employee01',
    role: 'employee',
    fullName: 'Nguyen Van An',
    email: 'employee01@example.com',
    phone: '0901234567',
    dateOfBirth: '2003-05-15',
    department: 'Engineering',
  })
  assert.deepEqual(await verifyAccessToken(session.accessToken, config.accessTokenSecret), {
    id: '1',
    username: 'employee01',
    role: 'employee',
  })
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
  assert.deepEqual(await verifyAccessToken(second.accessToken, config.accessTokenSecret), {
    id: '1',
    username: 'employee01',
    role: 'employee',
  })
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

  assert.deepEqual(user, {
    id: '9',
    username: 'employee09',
    role: 'production_supervisor',
  })
  assert.ok(repository.created)
  assert.equal(repository.created.username, 'employee09')
  assert.equal(repository.created.role, 'production_supervisor')
  assert.equal(await verifyPassword(registerInput.password, repository.created.passwordHash), true)
})

test('registers every supported role', async () => {
  const roles = [
    'employee',
    'production_supervisor',
    'hr',
    'security_guard',
    'admin',
    'executive_management',
  ] as const

  for (const role of roles) {
    const { repository, service } = await setup()
    const user = await service.register({ ...registerInput, role })

    assert.equal(user.role, role)
    assert.equal(repository.created?.role, role)
  }
})

test('propagates repository conflicts', async () => {
  const { repository, service } = await setup()
  repository.createAccount = async () => {
    throw new ConflictError('Username or email is already registered.')
  }

  await assert.rejects(service.register(registerInput), ConflictError)
})

const resetTokenFrom = (mail: { link: string }): string => {
  const token = new URL(mail.link).searchParams.get('token')
  assert.ok(token)
  return token
}

test('emails a single-use reset link for a registered address', async () => {
  const { repository, mailer, service } = await setup()

  await service.requestPasswordReset(' Employee01@Example.com ')

  assert.equal(mailer.sent.length, 1)
  assert.equal(mailer.sent[0].to, 'employee01@example.com')
  assert.equal(mailer.sent[0].ttlMinutes, 30)
  assert.equal(repository.resets.length, 1)
  assert.equal(repository.resets[0].tokenHash, hashToken(resetTokenFrom(mailer.sent[0])))
  assert.ok(repository.resets[0].expiresAt > new Date())
})

test('silently ignores unknown and inactive addresses', async () => {
  const { repository, mailer, service } = await setup({ isActive: false })

  await service.requestPasswordReset('nobody@example.com')
  await service.requestPasswordReset('employee01@example.com')

  assert.equal(repository.resets.length, 0)
  assert.equal(mailer.sent.length, 0)
})

test('still resolves when the mail server fails', async () => {
  const { mailer, service } = await setup()
  const errorLog = console.error
  mailer.fail = true
  console.error = () => undefined

  try {
    await service.requestPasswordReset('employee01@example.com')
  } finally {
    console.error = errorLog
  }

  assert.equal(mailer.sent.length, 0)
})

test('resets the password and revokes existing sessions', async () => {
  const { repository, mailer, service } = await setup()
  const session = await service.login('employee01', 'Secret123!')

  await service.requestPasswordReset('employee01@example.com')
  await service.resetPassword(resetTokenFrom(mailer.sent[0]), 'NewSecret1!')

  await assert.rejects(service.login('employee01', 'Secret123!'), AuthenticationError)
  await service.login('employee01', 'NewSecret1!')
  assert.ok(repository.credentials)
  assert.ok(await verifyPassword('NewSecret1!', repository.credentials.passwordHash))
  await assert.rejects(service.refresh(session.refreshToken), AuthenticationError)
})

test('rejects an already used or expired reset token', async () => {
  const { repository, mailer, service } = await setup()

  await service.requestPasswordReset('employee01@example.com')
  const token = resetTokenFrom(mailer.sent[0])
  await service.resetPassword(token, 'NewSecret1!')
  await assert.rejects(service.resetPassword(token, 'OtherSecret1!'), ValidationError)

  await service.requestPasswordReset('employee01@example.com')
  const expired = resetTokenFrom(mailer.sent[1])
  repository.resets[1].expiresAt = new Date(Date.now() - 1000)

  await assert.rejects(service.resetPassword(expired, 'OtherSecret1!'), ValidationError)
})

test('rejects an unknown reset token without hashing the password', async () => {
  const { service } = await setup()

  await assert.rejects(service.resetPassword('not-a-real-token', 'NewSecret1!'), ValidationError)
})
