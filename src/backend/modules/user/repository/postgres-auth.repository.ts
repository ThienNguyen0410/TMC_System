import type { Pool } from 'pg'
import type { AuthAccount } from '../domain/auth-user.ts'
import type { AuthRepository } from './auth.repository.ts'

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
}
