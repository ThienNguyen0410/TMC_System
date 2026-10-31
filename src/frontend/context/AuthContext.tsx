import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { mockUsers } from '../mocks/users'
import { loginWithPassword, type AuthApiUser } from '../services/auth.api'
import type {
  AppUser,
  LoginResult,
  MockUser,
  ProfileUpdateInput,
  RegisterInput,
  RegisterResult,
} from '../types/auth'
import { AuthContext, type AuthContextValue } from './authContextValue'

const SESSION_USER_KEY = 'tmc.session.user'
const REGISTERED_USERS_KEY = 'tmc.mock.registered-users'
const PROFILE_OVERRIDES_KEY = 'tmc.mock.profile-overrides'
const DELETED_USERS_KEY = 'tmc.mock.deleted-users'

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

function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_USER_KEY)
  } catch {
    return
  }
}

function readSessionUser(): AppUser | null {
  const session = readStorage<AppUser | null>(SESSION_USER_KEY, null)

  if (!session || typeof session.id !== 'string' || typeof session.username !== 'string') {
    return null
  }

  return session
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
    department: override?.department ?? user.department,
    qrCode: user.qrCode,
    avatarColor: user.avatarColor,
  }
}

function toSessionUser(account: AuthApiUser): AppUser {
  const colorIndex =
    Array.from(account.username).reduce((total, character) => total + character.charCodeAt(0), 0) %
    avatarPalette.length

  return {
    id: account.id,
    fullName: account.username,
    username: account.username,
    email: '',
    phone: '',
    dateOfBirth: '',
    role: account.role,
    department: account.role === 'admin' ? 'Administration' : 'Employee',
    qrCode: `TMC-QR-${account.id}-${account.username.toUpperCase()}`,
    avatarColor: avatarPalette[colorIndex],
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
  const [deletedUserIds, setDeletedUserIds] = useState<string[]>(() =>
    readStorage<string[]>(DELETED_USERS_KEY, []),
  )
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => readSessionUser())

  const baseAccounts = useMemo(
    () => [...mockUsers, ...registeredUsers],
    [registeredUsers],
  )

  const allAccounts = useMemo(
    () => baseAccounts.filter((account) => !deletedUserIds.includes(account.id)),
    [baseAccounts, deletedUserIds],
  )

  const users = useMemo(
    () => allAccounts.map((account) => toPublicUser(account, profileOverrides[account.id])),
    [allAccounts, profileOverrides],
  )

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    try {
      const account = await loginWithPassword(username.trim(), password)
      const sessionUser = toSessionUser(account)

      setCurrentUser(sessionUser)
      writeStorage(SESSION_USER_KEY, sessionUser)

      return { ok: true, user: sessionUser }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Sign in failed. Please try again.',
      }
    }
  }, [])

  const signOut = useCallback(() => {
    setCurrentUser(null)
    clearSession()
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

      const highestEmployeeNumber = baseAccounts
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
      const sessionUser = toPublicUser(newAccount)

      setRegisteredUsers(nextRegisteredUsers)
      writeStorage(REGISTERED_USERS_KEY, nextRegisteredUsers)
      setCurrentUser(sessionUser)
      writeStorage(SESSION_USER_KEY, sessionUser)

      return { ok: true, user: sessionUser }
    },
    [allAccounts, baseAccounts, registeredUsers],
  )

  const updateProfile = useCallback(
    (userId: string, input: ProfileUpdateInput): AppUser | null => {
      const account = allAccounts.find((candidate) => candidate.id === userId)

      if (account) {
        const nextOverrides = {
          ...profileOverrides,
          [userId]: { ...profileOverrides[userId], ...input },
        }
        const updatedUser = toPublicUser(account, nextOverrides[userId])

        setProfileOverrides(nextOverrides)
        writeStorage(PROFILE_OVERRIDES_KEY, nextOverrides)

        if (currentUser?.id === userId) {
          setCurrentUser(updatedUser)
          writeStorage(SESSION_USER_KEY, updatedUser)
        }

        return updatedUser
      }

      if (currentUser?.id === userId) {
        const updatedUser = { ...currentUser, ...input }
        setCurrentUser(updatedUser)
        writeStorage(SESSION_USER_KEY, updatedUser)
        return updatedUser
      }

      return null
    },
    [allAccounts, currentUser, profileOverrides],
  )

  const deleteUser = useCallback(
    (userId: string): boolean => {
      const account = allAccounts.find((candidate) => candidate.id === userId)

      if (!account) {
        return false
      }

      const nextDeletedUserIds = [...deletedUserIds, userId]
      setDeletedUserIds(nextDeletedUserIds)
      writeStorage(DELETED_USERS_KEY, nextDeletedUserIds)

      return true
    },
    [allAccounts, deletedUserIds],
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
    deleteUser,
    isEmailRegistered,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
