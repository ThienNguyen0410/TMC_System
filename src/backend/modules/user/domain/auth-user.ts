export type UserRole = 'employee' | 'admin'

export interface AuthAccount {
  id: string
  username: string
}

export interface AuthUser extends AuthAccount {
  role: UserRole
}

const roleByUsername: Record<string, UserRole> = {
  employee01: 'employee',
  admin01: 'admin',
}

export function resolveUserRole(username: string): UserRole {
  return roleByUsername[username.trim().toLowerCase()] ?? 'employee'
}
