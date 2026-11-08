import { NotFoundError } from '../../../shared/errors/app-error.ts'
import type { AuthUser, UpdateProfileInput } from '../domain/auth-user.ts'
import type { UserRepository } from '../repository/user.repository.ts'

export class UserService {
  private readonly userRepository: UserRepository

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository
  }

  listUsers(): Promise<AuthUser[]> {
    return this.userRepository.listUsers()
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<AuthUser> {
    const user = await this.userRepository.updateUserProfile(id, input)

    if (!user) {
      throw new NotFoundError('Account not found.')
    }

    return user
  }
}
