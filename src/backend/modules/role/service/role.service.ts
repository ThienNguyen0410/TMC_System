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
} from '../domain/role.ts'
import type { RoleRepository } from '../repository/role.repository.ts'

export class RoleService {
  private readonly repository: RoleRepository

  constructor(repository: RoleRepository) {
    this.repository = repository
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

  private async assertPermissionsExist(codes: string[]): Promise<void> {
    const known = new Set((await this.repository.listPermissions()).map((permission) => permission.code))
    const unknown = codes.filter((code) => !known.has(code))

    if (unknown.length > 0) {
      throw new ValidationError(`Unknown permission codes: ${unknown.join(', ')}`)
    }
  }
}
