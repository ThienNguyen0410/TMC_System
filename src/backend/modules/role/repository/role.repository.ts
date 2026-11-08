import type { Permission, Role, RoleName, UserRoleAssignment } from '../domain/role.ts'

/**
 * Runs inside the role-change transaction with freshly locked data.
 * Throwing aborts the change; returning false keeps the current role without writing.
 */
export type RoleChangeGuard = (
  current: UserRoleAssignment,
  otherActiveAdminCount: number,
) => boolean

export interface RoleRepository {
  listPermissions(): Promise<Permission[]>
  /** Only system roles (admin, employee), ordered by name. */
  listRoles(): Promise<Role[]>
  findRoleByName(name: RoleName): Promise<Role | null>
  updateRoleDescription(name: RoleName, description: string | null): Promise<void>
  /** Replaces the whole permission set of a role in one transaction. */
  replaceRolePermissions(name: RoleName, permissionCodes: string[]): Promise<void>
  /** Sorted permission codes held by the user through their role. */
  findPermissionCodesByUserId(userId: string): Promise<string[]>
  /** A missing or non-system role is reported as 'employee'. Null when the user does not exist. */
  findUserRole(userId: string): Promise<UserRoleAssignment | null>
  /**
   * In one transaction: lock the user and admin assignments, call the guard with the current
   * assignment and the number of other active admins, then set the user's single role when the
   * guard allows it. Returns the resulting assignment, or null when the user does not exist.
   */
  changeUserRole(
    userId: string,
    newRole: RoleName,
    guard: RoleChangeGuard,
  ): Promise<UserRoleAssignment | null>
}
