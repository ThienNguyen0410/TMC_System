import type { AuthAccount } from '../domain/auth-user.ts'

export interface AuthRepository {
  findByCredentials(username: string, password: string): Promise<AuthAccount | null>
}
