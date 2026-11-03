export type UserRole = 'employee' | 'admin'

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
}
