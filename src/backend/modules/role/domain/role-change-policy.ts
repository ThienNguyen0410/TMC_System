import type { RoleName, UserRoleAssignment } from './role.ts'

export interface RoleChangeRequest {
  actorId: string
  target: UserRoleAssignment
  newRole: RoleName
  /** Active admins other than the target account. */
  otherActiveAdminCount: number
}

/**
 * Decides who may change whose role. Throws an AppError when the change is not allowed.
 * Swap the implementation in app.ts to change the rule without touching other code.
 */
export interface RoleChangePolicy {
  assertCanChange(request: RoleChangeRequest): void
}
