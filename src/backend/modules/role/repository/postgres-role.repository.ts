import type { Pool, PoolClient } from 'pg'
import { SYSTEM_ROLES, type Permission, type Role, type RoleName } from '../domain/role.ts'
import type { PermissionChecker } from './permission-checker.ts'
import type { RoleRepository } from './role.repository.ts'

interface RoleRow {
  id: string
  name: RoleName
  description: string | null
  permissionCodes: string[]
}

const roleSelect = `
  SELECT r.id::text AS id, r.name, r.description,
         coalesce(array_agg(p.code ORDER BY p.code) FILTER (WHERE p.code IS NOT NULL), '{}')
           AS "permissionCodes"
  FROM role.roles r
  LEFT JOIN role.role_permissions rp ON rp.role_id = r.id
  LEFT JOIN role.permissions p ON p.id = rp.permission_id
  WHERE r.name = ANY($1::text[])
  GROUP BY r.id
  ORDER BY r.name
`

// The role every module agrees on: the user's first role by name (as the user module reads it),
// and anything other than admin counts as employee. Permissions are derived from this role too,
// so what the API reports and what the user may do can never disagree.
const effectiveRoleSelect = `
  SELECT CASE WHEN r.name = 'admin' THEN 'admin' ELSE 'employee' END AS role
  FROM "user".users u
  LEFT JOIN LATERAL (
    SELECT roles.name
    FROM role.account_roles ar
    JOIN role.roles roles ON roles.id = ar.role_id
    WHERE ar.account_id = u.id
    ORDER BY roles.name
    LIMIT 1
  ) r ON TRUE
  WHERE u.id = $1::bigint
`

const userPermissionCodesSelect = `
  SELECT p.code
  FROM (${effectiveRoleSelect}) e
  JOIN role.roles r ON r.name = e.role
  JOIN role.role_permissions rp ON rp.role_id = r.id
  JOIN role.permissions p ON p.id = rp.permission_id
`

export class PostgresRoleRepository implements RoleRepository, PermissionChecker {
  private readonly pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const result = await this.pool.query<{ allowed: boolean }>(
      `SELECT EXISTS (${userPermissionCodesSelect} WHERE p.code = $2) AS allowed`,
      [userId, permissionCode],
    )

    return result.rows[0]?.allowed ?? false
  }

  async listPermissions(): Promise<Permission[]> {
    const result = await this.pool.query<Permission>(
      `SELECT code, description FROM role.permissions ORDER BY code`,
    )

    return result.rows
  }

  async listRoles(): Promise<Role[]> {
    const result = await this.pool.query<RoleRow>(roleSelect, [[...SYSTEM_ROLES]])
    return result.rows
  }

  async findRoleByName(name: RoleName): Promise<Role | null> {
    const result = await this.pool.query<RoleRow>(roleSelect, [[name]])
    return result.rows[0] ?? null
  }

  async updateRoleDescription(name: RoleName, description: string | null): Promise<void> {
    await this.pool.query(`UPDATE role.roles SET description = $2 WHERE name = $1`, [
      name,
      description,
    ])
  }

  async replaceRolePermissions(name: RoleName, permissionCodes: string[]): Promise<void> {
    await this.withTransaction(async (client) => {
      await client.query(
        `DELETE FROM role.role_permissions
         WHERE role_id = (SELECT id FROM role.roles WHERE name = $1)`,
        [name],
      )
      await client.query(
        `INSERT INTO role.role_permissions (role_id, permission_id)
         SELECT r.id, p.id
         FROM role.roles r
         JOIN role.permissions p ON p.code = ANY($2::text[])
         WHERE r.name = $1`,
        [name, permissionCodes],
      )
    })
  }

  async findPermissionCodesByUserId(userId: string): Promise<string[]> {
    const result = await this.pool.query<{ code: string }>(
      `${userPermissionCodesSelect} ORDER BY p.code`,
      [userId],
    )

    return result.rows.map((row) => row.code)
  }

  private async withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')
      const result = await work(client)
      await client.query('COMMIT')
      client.release()
      return result
    } catch (error) {
      try {
        await client.query('ROLLBACK')
        client.release()
      } catch (rollbackError) {
        // The connection is broken: passing the error makes the pool discard it instead of reusing it.
        client.release(rollbackError as Error)
      }
      // Always surface the original failure, not the rollback's.
      throw error
    }
  }
}
