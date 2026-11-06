/**
 * The only thing authorization needs to know: does this user hold this permission?
 * Kept separate from RoleRepository so middleware depends on the smallest possible contract.
 */
export interface PermissionChecker {
  hasPermission(userId: string, permissionCode: string): Promise<boolean>
}
