import { ConflictError, NotFoundError } from '../../../shared/errors/app-error.ts'
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

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findUserById(id)

    if (!user) {
      throw new NotFoundError('Account not found.')
    }

    if (user.role === 'admin') {
      throw new ConflictError('Administrator accounts cannot be deleted.')
    }

    if (!(await this.userRepository.deactivateUser(id))) {
      throw new NotFoundError('Account not found.')
    }
  }
}
