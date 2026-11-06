import { ConflictError, ForbiddenError } from '../../../shared/errors/app-error.ts'
import type { RoleChangePolicy, RoleChangeRequest } from './role-change-policy.ts'

/**
 * Admins may promote employees, may not change another admin's role,
 * and may demote themselves only while another active admin remains.
 */
export class AdminProtectedRoleChangePolicy implements RoleChangePolicy {
  assertCanChange({ actorId, target, newRole, otherActiveAdminCount }: RoleChangeRequest): void {
    if (target.role !== 'admin') {
      return
    }

    if (target.userId !== actorId) {
      throw new ForbiddenError("Admins cannot change another admin's role.")
    }

    if (newRole === 'employee' && otherActiveAdminCount === 0) {
      throw new ConflictError('The last active admin cannot give up the admin role.')
    }
  }
}
