import { AuthenticationError } from '../../../shared/errors/app-error.ts'
import { resolveUserRole, type AuthUser } from '../domain/auth-user.ts'
import type { AuthRepository } from '../repository/auth.repository.ts'

export class AuthService {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async login(username: string, password: string): Promise<AuthUser> {
    const account = await this.authRepository.findByCredentials(username, password)

    if (!account) {
      throw new AuthenticationError()
    }

    return {
      ...account,
      role: resolveUserRole(account.username),
    }
  }
}
