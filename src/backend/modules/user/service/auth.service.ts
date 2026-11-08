import { AuthenticationError, ValidationError } from '../../../shared/errors/app-error.ts'
import { hashPassword, verifyPassword } from '../../../shared/security/password.ts'
import {
  createRefreshToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from '../../../shared/security/tokens.ts'
import type { AuthIdentity, AuthUser, RegisterInput } from '../domain/auth-user.ts'
import type { PasswordResetMailer } from '../mailer/password-reset-mailer.ts'
import type { AuthRepository, NewRefreshToken } from '../repository/auth.repository.ts'

export interface AuthServiceConfig {
  accessTokenSecret: string
  accessTokenTtlSeconds: number
  refreshTokenTtlDays: number
  appBaseUrl: string
  passwordResetTtlMinutes: number
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
  refreshToken: string
  refreshExpiresAt: Date
}

export class AuthService {
  private readonly authRepository: AuthRepository
  private readonly config: AuthServiceConfig
  private readonly mailer: PasswordResetMailer

  constructor(
    authRepository: AuthRepository,
    config: AuthServiceConfig,
    mailer: PasswordResetMailer,
  ) {
    this.authRepository = authRepository
    this.config = config
    this.mailer = mailer
  }

  async login(username: string, password: string): Promise<AuthSession> {
    const normalizedUsername = username.trim().toLowerCase()
    const account = await this.authRepository.findByUsername(normalizedUsername)

    if (!account || !account.isActive || !(await verifyPassword(password, account.passwordHash))) {
      throw new AuthenticationError()
    }

    return this.createSession({
      id: account.id,
      username: account.username,
      role: account.role,
      fullName: account.fullName,
      email: account.email,
      phone: account.phone,
      dateOfBirth: account.dateOfBirth,
      department: account.department,
    })
  }

  async refresh(rawToken: string | undefined): Promise<AuthSession> {
    if (!rawToken) {
      throw new AuthenticationError('Refresh token is required.')
    }

    const record = await this.authRepository.findRefreshToken(hashToken(rawToken))

    if (!record || record.revokedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new AuthenticationError('Invalid or expired refresh token.')
    }

    const user = await this.authRepository.findUserById(record.userId)

    if (!user) {
      throw new AuthenticationError('Invalid or expired refresh token.')
    }

    const next = this.newRefreshToken(record.userId)

    if (!(await this.authRepository.rotateRefreshToken(record.id, next.record))) {
      throw new AuthenticationError('Invalid or expired refresh token.')
    }

    return {
      user,
      accessToken: await this.issueAccessToken(user),
      refreshToken: next.token,
      refreshExpiresAt: next.record.expiresAt,
    }
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (rawToken) {
      await this.authRepository.revokeRefreshToken(hashToken(rawToken))
    }
  }

  async authenticateAccessToken(rawToken: string | undefined): Promise<AuthUser | null> {
    if (!rawToken) {
      return null
    }

    const tokenUser = await verifyAccessToken(rawToken, this.config.accessTokenSecret)

    if (!tokenUser) {
      return null
    }

    return this.authRepository.findUserById(tokenUser.id)
  }

  async register(input: RegisterInput): Promise<AuthIdentity> {
    const passwordHash = await hashPassword(input.password)
    const account = await this.authRepository.createAccount({ ...input, passwordHash })

    return {
      ...account,
      role: input.role,
    }
  }

  // shortcut: no per-address throttle, so a known email can be mail-bombed; add one when abuse appears.
  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase()
    const userId = await this.authRepository.findActiveUserIdByEmail(normalizedEmail)

    if (!userId) {
      return
    }

    const { token, hash } = createRefreshToken()
    const ttlMinutes = this.config.passwordResetTtlMinutes
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)

    await this.authRepository.createPasswordReset({ userId, tokenHash: hash, expiresAt })

    const link = `${this.config.appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`

    try {
      await this.mailer.sendPasswordReset(normalizedEmail, link, ttlMinutes)
    } catch (error) {
      // The response must not reveal whether the address exists or whether mail is configured.
      console.error('[password-reset] Failed to send the reset email', error)
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const record = await this.authRepository.findPasswordReset(hashToken(token))

    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw new ValidationError('This reset link is invalid or has expired.')
    }

    // Hash only after the token checks so garbage tokens cannot burn scrypt CPU.
    const passwordHash = await hashPassword(password)

    if (!(await this.authRepository.consumePasswordReset(record.id, passwordHash))) {
      throw new ValidationError('This reset link is invalid or has expired.')
    }
  }

  private async createSession(user: AuthUser): Promise<AuthSession> {
    const next = this.newRefreshToken(user.id)
    await this.authRepository.createRefreshToken(next.record)

    return {
      user,
      accessToken: await this.issueAccessToken(user),
      refreshToken: next.token,
      refreshExpiresAt: next.record.expiresAt,
    }
  }

  private newRefreshToken(userId: string): { token: string; record: NewRefreshToken } {
    const { token, hash } = createRefreshToken()
    const expiresAt = new Date(
      Date.now() + this.config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    )

    return { token, record: { userId, tokenHash: hash, expiresAt } }
  }

  private issueAccessToken(user: AuthUser): Promise<string> {
    return signAccessToken(user, this.config.accessTokenSecret, this.config.accessTokenTtlSeconds)
  }
}
