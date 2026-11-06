import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/app-error.ts'
import {
  isRoleName,
  RBAC_MANAGE_PERMISSION,
  type Permission,
  type Role,
  type RoleName,
  type UserRoleAssignment,
} from '../domain/role.ts'
import type { RoleChangePolicy } from '../domain/role-change-policy.ts'
import type { RoleRepository } from '../repository/role.repository.ts'

export class RoleService {
  private readonly repository: RoleRepository
  private readonly policy: RoleChangePolicy

  constructor(repository: RoleRepository, policy: RoleChangePolicy) {
    this.repository = repository
    this.policy = policy
  }

  listPermissions(): Promise<Permission[]> {
    return this.repository.listPermissions()
  }

  listRoles(): Promise<Role[]> {
    return this.repository.listRoles()
  }

  async getRole(name: string): Promise<Role> {
    const role = isRoleName(name) ? await this.repository.findRoleByName(name) : null

    if (!role) {
      throw new NotFoundError(`Role ${name} not found.`)
    }

    return role
  }

  async updateRoleDescription(name: string, description: string | null): Promise<Role> {
    const role = await this.getRole(name)
    await this.repository.updateRoleDescription(role.name, description)
    return this.getRole(role.name)
  }

  async replaceRolePermissions(name: string, permissionCodes: string[]): Promise<Role> {
    const role = await this.getRole(name)
    const codes = [...new Set(permissionCodes.map((code) => code.trim()))]

    await this.assertPermissionsExist(codes)

    if (role.name === 'admin' && !codes.includes(RBAC_MANAGE_PERMISSION)) {
      throw new ConflictError(`The admin role must keep the ${RBAC_MANAGE_PERMISSION} permission.`)
    }

    await this.repository.replaceRolePermissions(role.name, codes)
    return this.getRole(role.name)
  }

  getPermissionsForUser(userId: string): Promise<string[]> {
    return this.repository.findPermissionCodesByUserId(userId)
  }

  async getUserRole(userId: string): Promise<UserRoleAssignment> {
    const assignment = await this.repository.findUserRole(userId)

    if (!assignment) {
      throw new NotFoundError(`User ${userId} not found.`)
    }

    return assignment
  }

  async changeUserRole(
    actorId: string,
    userId: string,
    newRole: RoleName,
  ): Promise<UserRoleAssignment> {
    const current = await this.getUserRole(userId)
    this.assertActive(current)

    if (current.role === newRole) {
      return current
    }

    const updated = await this.repository.changeUserRole(userId, newRole, (locked, otherActiveAdminCount) => {
      // Re-checked on locked data: the account may have changed since the first read.
      this.assertActive(locked)
      this.policy.assertCanChange({ actorId, target: locked, newRole, otherActiveAdminCount })
    })

    if (!updated) {
      throw new NotFoundError(`User ${userId} not found.`)
    }

    return updated
  }

  private assertActive(assignment: UserRoleAssignment): void {
    if (!assignment.isActive) {
      throw new ConflictError('Cannot change the role of a deactivated account.')
    }
  }

  private async assertPermissionsExist(codes: string[]): Promise<void> {
    const known = new Set((await this.repository.listPermissions()).map((permission) => permission.code))
    const unknown = codes.filter((code) => !known.has(code))

    if (unknown.length > 0) {
      throw new ValidationError(`Unknown permission codes: ${unknown.join(', ')}`)
    }
  }
}
