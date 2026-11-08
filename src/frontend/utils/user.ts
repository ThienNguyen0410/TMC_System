import type { AccountRole } from '../types/auth'

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const roleLabels: Record<AccountRole, string> = {
  employee: 'Employee',
  production_supervisor: 'Production Supervisor',
  hr: 'Human Resources',
  security_guard: 'Security Guard',
  admin: 'Administrator',
  executive_management: 'Executive Management',
}

export function getRoleLabel(role: AccountRole): string {
  return roleLabels[role]
}

// Stable colour per account, so the same username always gets the same avatar.
export function avatarColorFor(username: string): string {
  const palette = ['#2563eb', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#0369a1']
  const sum = Array.from(username).reduce((total, character) => total + character.charCodeAt(0), 0)

  return palette[sum % palette.length]
}
