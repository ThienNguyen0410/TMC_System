import type { AuthUser, UpdateProfileInput } from '../domain/auth-user.ts'

export interface UserRepository {
  listUsers(): Promise<AuthUser[]>
  updateUserProfile(id: string, input: UpdateProfileInput): Promise<AuthUser | null>
}
