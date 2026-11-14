import type { Permission, Role, RoleName } from '../domain/role.ts'

export interface RoleRepository {
  listPermissions(): Promise<Permission[]>
  /** Only system roles (admin, employee), ordered by name. */
  listRoles(): Promise<Role[]>
  findRoleByName(name: RoleName): Promise<Role | null>
  updateRoleDescription(name: RoleName, description: string | null): Promise<void>
  /** Replaces the whole permission set of a role in one transaction. */
  replaceRolePermissions(name: RoleName, permissionCodes: string[]): Promise<void>
  /** Sorted permission codes held by the user through their role; a missing or non-system role counts as employee. */
  findPermissionCodesByUserId(userId: string): Promise<string[]>
}
