import { randomBytes, scrypt } from 'node:crypto'
import { AuthenticationError } from '../../../shared/errors/app-error.ts'
import { resolveUserRole, type AuthUser, type RegisterInput } from '../domain/auth-user.ts'
import type { AuthRepository } from '../repository/auth.repository.ts'

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1

const hashPassword = (password: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const salt = randomBytes(16)

    scrypt(password, salt, 64, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (error, key) => {
      if (error) {
        reject(error)
        return
      }

      resolve(
        `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${key.toString('base64')}`,
      )
    })
  })

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

  async register(input: RegisterInput): Promise<AuthUser> {
    const passwordHash = await hashPassword(input.password)
    const account = await this.authRepository.createAccount({ ...input, passwordHash })

    return {
      ...account,
      role: 'employee',
    }
  }
}
