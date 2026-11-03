import type { AuthAccount, RegisterInput } from '../domain/auth-user.ts'

export interface NewAccount extends RegisterInput {
  passwordHash: string
}

export interface AuthRepository {
  findByCredentials(username: string, password: string): Promise<AuthAccount | null>
  createAccount(account: NewAccount): Promise<AuthAccount>
}
