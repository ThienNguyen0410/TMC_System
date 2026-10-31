import { createContext } from 'react'
import type {
  AppUser,
  LoginResult,
  ProfileUpdateInput,
  RegisterInput,
  RegisterResult,
} from '../types/auth'

export interface AuthContextValue {
  currentUser: AppUser | null
  users: AppUser[]
  login: (username: string, password: string) => Promise<LoginResult>
  signOut: () => void
  register: (input: RegisterInput) => RegisterResult
  updateProfile: (userId: string, input: ProfileUpdateInput) => AppUser | null
  deleteUser: (userId: string) => boolean
  isEmailRegistered: (email: string) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
