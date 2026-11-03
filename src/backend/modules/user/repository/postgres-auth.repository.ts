import type { Pool } from 'pg'
import { ConflictError } from '../../../shared/errors/app-error.ts'
import type { AuthAccount } from '../domain/auth-user.ts'
import type { AuthRepository, NewAccount } from './auth.repository.ts'

interface AccountRow {
  id: string
  username: string
}

export class PostgresAuthRepository implements AuthRepository {
  private readonly pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  async findByCredentials(username: string, password: string): Promise<AuthAccount | null> {
    const result = await this.pool.query<AccountRow>(
      `SELECT id::text AS id, username
       FROM "user".test_account
       WHERE username = $1 AND pass_word = $2
       LIMIT 1`,
      [username, password],
    )

    const row = result.rows[0]
    return row ? { id: row.id, username: row.username } : null
  }

  async createAccount(account: NewAccount): Promise<AuthAccount> {
    try {
      const result = await this.pool.query<AccountRow>(
        `WITH new_user AS (
           INSERT INTO "user".users
             (username, password_hash, full_name, phone_number, email, date_of_birth)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, username
         ), assigned AS (
           INSERT INTO "role".account_roles (account_id, role_id)
           SELECT new_user.id, roles.id
           FROM new_user
           JOIN "role".roles roles ON roles.name = 'employee'
         )
         SELECT id::text AS id, username FROM new_user`,
        [
          account.username,
          account.passwordHash,
          account.fullName,
          account.phone,
          account.email,
          account.dateOfBirth,
        ],
      )

      return result.rows[0]
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictError('Username or email is already registered.')
      }

      throw error
    }
  }
}
