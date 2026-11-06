export const SYSTEM_ROLES = ['admin', 'employee'] as const

export type RoleName = (typeof SYSTEM_ROLES)[number]

export const isRoleName = (value: string): value is RoleName =>
  (SYSTEM_ROLES as readonly string[]).includes(value)

export const RBAC_MANAGE_PERMISSION = 'rbac.manage'

export interface Permission {
  code: string
  description: string | null
}

export interface Role {
  id: string
  name: RoleName
  description: string | null
  permissionCodes: string[]
}

export interface UserRoleAssignment {
  userId: string
  username: string
  role: RoleName
  isActive: boolean
}
