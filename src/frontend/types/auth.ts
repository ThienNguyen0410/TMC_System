export type AccountRole =
  | 'employee'
  | 'production_supervisor'
  | 'hr'
  | 'security_guard'
  | 'admin'
  | 'executive_management'

export interface MockUser {
  id: string
  fullName: string
  username: string
  password: string
  email: string
  phone: string
  dateOfBirth: string
  role: AccountRole
  department: string
  qrCode: string
  avatarColor: string
}

export type AppUser = Omit<MockUser, 'password'>

export interface LoginResult {
  ok: boolean
  user?: AppUser
  error?: string
}

export interface RegisterInput {
  fullName: string
  username: string
  password: string
  email: string
  phone: string
  dateOfBirth: string
  role: string
}

export type RegisterErrorField = 'username' | 'email'

export interface RegisterResult {
  ok: boolean
  user?: AppUser
  error?: string
  field?: RegisterErrorField
}

export interface ProfileUpdateInput {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  department?: string
}
