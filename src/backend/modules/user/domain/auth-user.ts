export type UserRole =
  | 'employee'
  | 'production_supervisor'
  | 'hr'
  | 'security_guard'
  | 'admin'
  | 'executive_management'

export interface AuthAccount {
  id: string
  username: string
}

export interface AuthProfile {
  fullName: string
  email: string | null
  phone: string | null
  dateOfBirth: string | null
  department: string | null
}

export interface AuthIdentity extends AuthAccount {
  role: UserRole
}

export interface AuthUser extends AuthAccount, AuthProfile {
  role: UserRole
}

export interface RegisterInput {
  fullName: string
  username: string
  password: string
  email: string
  phone: string
  dateOfBirth: string
  role: UserRole
}
