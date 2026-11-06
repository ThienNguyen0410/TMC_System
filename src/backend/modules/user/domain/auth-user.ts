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

export interface AuthUser extends AuthAccount {
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
