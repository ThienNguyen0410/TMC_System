import type { AuthUser, UpdateProfileInput } from '../domain/auth-user.ts'

export interface UserRepository {
  findUserById(id: string): Promise<AuthUser | null>
  listUsers(): Promise<AuthUser[]>
  updateUserProfile(id: string, input: UpdateProfileInput): Promise<AuthUser | null>
  deactivateUser(id: string): Promise<AuthUser | null>
}
