import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { mockUsers } from '../mocks/users'
import type {
  AppUser,
  LoginResult,
  MockUser,
  ProfileUpdateInput,
  RegisterInput,
  RegisterResult,
} from '../types/auth'
import { AuthContext, type AuthContextValue } from './authContextValue'

const SESSION_KEY = 'tmc.mock.session'
const REGISTERED_USERS_KEY = 'tmc.mock.registered-users'
const PROFILE_OVERRIDES_KEY = 'tmc.mock.profile-overrides'

const avatarPalette = ['#2563eb', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#0369a1']

function readStorage<T>(key: string, fallback: T): T {
  try {
    const rawValue = window.localStorage.getItem(key)
    return rawValue ? (JSON.parse(rawValue) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    return
  }
}

function readSession(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function writeSession(userId: string | null): void {
  try {
    if (userId === null) {
      window.localStorage.removeItem(SESSION_KEY)
      return
    }
    window.localStorage.setItem(SESSION_KEY, userId)
  } catch {
    return
  }
}

function toPublicUser(user: MockUser, override?: ProfileUpdateInput): AppUser {
  return {
    id: user.id,
    fullName: override?.fullName ?? user.fullName,
    username: user.username,
    email: override?.email ?? user.email,
    phone: override?.phone ?? user.phone,
    dateOfBirth: override?.dateOfBirth ?? user.dateOfBirth,
    role: user.role,
    department: user.department,
    qrCode: user.qrCode,
    avatarColor: user.avatarColor,
  }
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [registeredUsers, setRegisteredUsers] = useState<MockUser[]>(() =>
    readStorage<MockUser[]>(REGISTERED_USERS_KEY, []),
  )
  const [profileOverrides, setProfileOverrides] = useState<Record<string, ProfileUpdateInput>>(() =>
    readStorage<Record<string, ProfileUpdateInput>>(PROFILE_OVERRIDES_KEY, {}),
  )
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => readSession())

  const allAccounts = useMemo(() => [...mockUsers, ...registeredUsers], [registeredUsers])

  const users = useMemo(
    () => allAccounts.map((account) => toPublicUser(account, profileOverrides[account.id])),
    [allAccounts, profileOverrides],
  )

  const currentUser = useMemo(
    () => users.find((user) => user.id === currentUserId) ?? null,
    [users, currentUserId],
  )

  const login = useCallback(
    (username: string, password: string): LoginResult => {
      const normalizedUsername = username.trim().toLowerCase()
      const account = allAccounts.find(
        (candidate) =>
          candidate.username.toLowerCase() === normalizedUsername && candidate.password === password,
      )

      if (!account) {
        return { ok: false, error: 'Invalid username or password. Please try again.' }
      }

      setCurrentUserId(account.id)
      writeSession(account.id)
      return { ok: true, user: toPublicUser(account, profileOverrides[account.id]) }
    },
    [allAccounts, profileOverrides],
  )

  const signOut = useCallback(() => {
    setCurrentUserId(null)
    writeSession(null)
  }, [])

  const register = useCallback(
    (input: RegisterInput): RegisterResult => {
      const normalizedUsername = input.username.trim().toLowerCase()
      const normalizedEmail = input.email.trim().toLowerCase()

      if (allAccounts.some((account) => account.username.toLowerCase() === normalizedUsername)) {
        return { ok: false, error: 'This username is already in use.', field: 'username' }
      }

      if (allAccounts.some((account) => account.email.toLowerCase() === normalizedEmail)) {
        return { ok: false, error: 'An account with this email already exists.', field: 'email' }
      }

      const highestEmployeeNumber = allAccounts
        .filter((account) => account.role === 'employee' && /^EMP-\d+$/.test(account.id))
        .reduce((highest, account) => Math.max(highest, Number(account.id.slice(4))), 0)
      const nextNumber = highestEmployeeNumber + 1
      const employeeId = `EMP-${String(nextNumber).padStart(4, '0')}`
      const qrToken = Math.random().toString(36).slice(2, 6).toUpperCase()
      const newAccount: MockUser = {
        id: employeeId,
        fullName: input.fullName.trim(),
        username: normalizedUsername,
        password: input.password,
        email: normalizedEmail,
        phone: input.phone.trim(),
        dateOfBirth: input.dateOfBirth,
        role: 'employee',
        department: 'General',
        qrCode: `TMC-QR-${employeeId}-${qrToken}`,
        avatarColor: avatarPalette[(nextNumber - 1) % avatarPalette.length],
      }

      const nextRegisteredUsers = [...registeredUsers, newAccount]
      setRegisteredUsers(nextRegisteredUsers)
      writeStorage(REGISTERED_USERS_KEY, nextRegisteredUsers)
      setCurrentUserId(newAccount.id)
      writeSession(newAccount.id)

      return { ok: true, user: toPublicUser(newAccount) }
    },
    [allAccounts, registeredUsers],
  )

  const updateProfile = useCallback(
    (userId: string, input: ProfileUpdateInput): AppUser | null => {
      const nextOverrides = {
        ...profileOverrides,
        [userId]: { ...profileOverrides[userId], ...input },
      }
      setProfileOverrides(nextOverrides)
      writeStorage(PROFILE_OVERRIDES_KEY, nextOverrides)

      const account = allAccounts.find((candidate) => candidate.id === userId)
      return account ? toPublicUser(account, nextOverrides[userId]) : null
    },
    [allAccounts, profileOverrides],
  )

  const isEmailRegistered = useCallback(
    (email: string): boolean => {
      const normalizedEmail = email.trim().toLowerCase()
      return allAccounts.some((account) => account.email.toLowerCase() === normalizedEmail)
    },
    [allAccounts],
  )

  const value: AuthContextValue = {
    currentUser,
    users,
    login,
    signOut,
    register,
    updateProfile,
    isEmailRegistered,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
