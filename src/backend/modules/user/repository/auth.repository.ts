import type { AuthAccount, AuthUser, RegisterInput } from '../domain/auth-user.ts'

export interface NewAccount extends RegisterInput {
  passwordHash: string
}

export interface AuthCredentials extends AuthUser {
  passwordHash: string
  isActive: boolean
}

export interface NewRefreshToken {
  userId: string
  tokenHash: string
  expiresAt: Date
}

export interface RefreshTokenRecord {
  id: string
  userId: string
  expiresAt: Date
  revokedAt: Date | null
}

export interface AuthRepository {
  findByUsername(username: string): Promise<AuthCredentials | null>
  findUserById(id: string): Promise<AuthUser | null>
  createAccount(account: NewAccount): Promise<AuthAccount>
  createRefreshToken(token: NewRefreshToken): Promise<void>
  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>
  rotateRefreshToken(currentId: string, next: NewRefreshToken): Promise<boolean>
  revokeRefreshToken(tokenHash: string): Promise<void>
}
