import type { Pool } from 'pg'
import { ConflictError } from '../../../shared/errors/app-error.ts'
import type { AuthAccount, AuthUser, UserRole } from '../domain/auth-user.ts'
import type {
  AuthCredentials,
  AuthRepository,
  NewAccount,
  NewRefreshToken,
  RefreshTokenRecord,
} from './auth.repository.ts'

interface AccountRow {
  id: string
  username: string
}

interface CredentialsRow extends AccountRow {
  passwordHash: string
  role: string
  isActive: boolean
}

interface UserRow extends AccountRow {
  role: string
}

interface RefreshTokenRow {
  id: string
  userId: string
  expiresAt: Date
  revokedAt: Date | null
}

const toRole = (role: string): UserRole => {
  switch (role) {
    case 'employee':
    case 'production_supervisor':
    case 'hr':
    case 'security_guard':
    case 'admin':
    case 'executive_management':
      return role
    default:
      throw new Error(`Unsupported account role: ${role}`)
  }
}

const userSelect = `
  SELECT u.id::text AS id, u.username, coalesce(r.name, 'employee') AS role
  FROM "user".users u
  LEFT JOIN LATERAL (
    SELECT roles.name
    FROM role.account_roles ar
    JOIN role.roles roles ON roles.id = ar.role_id
    WHERE ar.account_id = u.id
    ORDER BY roles.name
    LIMIT 1
  ) r ON TRUE
`

export class PostgresAuthRepository implements AuthRepository {
  private readonly pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  async findByUsername(username: string): Promise<AuthCredentials | null> {
    const result = await this.pool.query<CredentialsRow>(
      `SELECT u.id::text AS id, u.username, u.password_hash AS "passwordHash",
              u.is_active AS "isActive", coalesce(r.name, 'employee') AS role
       FROM "user".users u
       LEFT JOIN LATERAL (
         SELECT roles.name
         FROM role.account_roles ar
         JOIN role.roles roles ON roles.id = ar.role_id
         WHERE ar.account_id = u.id
         ORDER BY roles.name
         LIMIT 1
       ) r ON TRUE
       WHERE u.username = $1
       LIMIT 1`,
      [username],
    )

    const row = result.rows[0]
    return row
      ? {
          id: row.id,
          username: row.username,
          passwordHash: row.passwordHash,
          role: toRole(row.role),
          isActive: row.isActive,
        }
      : null
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    const result = await this.pool.query<UserRow>(
      `${userSelect} WHERE u.id = $1 AND u.is_active = TRUE LIMIT 1`,
      [id],
    )
    const row = result.rows[0]

    return row ? { id: row.id, username: row.username, role: toRole(row.role) } : null
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
           JOIN "role".roles roles ON roles.name = $7
         )
         SELECT id::text AS id, username FROM new_user`,
        [
          account.username,
          account.passwordHash,
          account.fullName,
          account.phone,
          account.email,
          account.dateOfBirth,
          account.role,
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

  async createRefreshToken(token: NewRefreshToken): Promise<void> {
    await this.pool.query(
      `INSERT INTO "user".refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [token.userId, token.tokenHash, token.expiresAt],
    )
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const result = await this.pool.query<RefreshTokenRow>(
      `SELECT id::text AS id, user_id::text AS "userId",
              expires_at AS "expiresAt", revoked_at AS "revokedAt"
       FROM "user".refresh_tokens
       WHERE token_hash = $1
       LIMIT 1`,
      [tokenHash],
    )

    return result.rows[0] ?? null
  }

  async rotateRefreshToken(currentId: string, next: NewRefreshToken): Promise<boolean> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      const current = await client.query<{ userId: string }>(
        `UPDATE "user".refresh_tokens
         SET revoked_at = NOW()
         WHERE id = $1 AND revoked_at IS NULL AND expires_at > NOW()
         RETURNING user_id::text AS "userId"`,
        [currentId],
      )

      if (current.rowCount !== 1) {
        await client.query('ROLLBACK')
        return false
      }

      const replacement = await client.query<{ id: string }>(
        `INSERT INTO "user".refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id::text AS id`,
        [current.rows[0].userId, next.tokenHash, next.expiresAt],
      )

      const replacementId = replacement.rows[0]?.id

      if (!replacementId) {
        throw new Error('Refresh token replacement was not created')
      }

      const linked = await client.query(
        `UPDATE "user".refresh_tokens
         SET replaced_by_id = $2
         WHERE id = $1`,
        [currentId, replacementId],
      )

      if (linked.rowCount !== 1) {
        throw new Error('Refresh token replacement was not linked')
      }

      await client.query('COMMIT')
      return true
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw error
    } finally {
      client.release()
    }
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.pool.query(
      `UPDATE "user".refresh_tokens
       SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    )
  }
}
