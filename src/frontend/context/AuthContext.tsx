import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { mockUsers } from '../mocks/users'
import {
  loginWithPassword,
  logoutSession,
  refreshSession,
  registerAccount,
  type AuthApiUser,
} from '../services/auth.api'
import type {
  AppUser,
  LoginResult,
  MockUser,
  ProfileUpdateInput,
  RegisterInput,
  RegisterResult,
} from '../types/auth'
import { AuthContext, type AuthContextValue } from './authContextValue'

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
    fullName: account.fullName,
    username: account.username,
    email: account.email ?? '',
    phone: account.phone ?? '',
    dateOfBirth: account.dateOfBirth ?? '',
    role: account.role,
    department: account.department ?? '',
    qrCode: `TMC-QR-${account.id}-${account.username.toUpperCase()}`,
    avatarColor: avatarPalette[colorIndex],
  }
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [profileOverrides, setProfileOverrides] = useState<Record<string, ProfileUpdateInput>>(() =>
    readStorage<Record<string, ProfileUpdateInput>>(PROFILE_OVERRIDES_KEY, {}),
  )
  const [deletedUserIds, setDeletedUserIds] = useState<string[]>(() =>
    readStorage<string[]>(DELETED_USERS_KEY, []),
  )
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)

  useEffect(() => {
    let active = true

    void refreshSession()
      .then((account) => {
        if (active && account) {
          setCurrentUser(toSessionUser(account))
        }
      })
      .finally(() => {
        if (active) {
          setIsRestoring(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const allAccounts = useMemo(
    () => mockUsers.filter((account) => !deletedUserIds.includes(account.id)),
    [deletedUserIds],
  )

  const users = useMemo(
    () => allAccounts.map((account) => toPublicUser(account, profileOverrides[account.id])),
    [allAccounts, profileOverrides],
  )

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    try {
      const sessionUser = toSessionUser(await loginWithPassword(username.trim(), password))

      setCurrentUser(sessionUser)

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
    void logoutSession()
  }, [])

  const register = useCallback(async (input: RegisterInput): Promise<RegisterResult> => {
    try {
      await registerAccount(input)
      const sessionUser = toSessionUser(await loginWithPassword(input.username, input.password))

      setCurrentUser(sessionUser)

      return { ok: true, user: sessionUser }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Registration failed. Please try again.',
      }
    }
  }, [])

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
        }

        return updatedUser
      }

      if (currentUser?.id === userId) {
        const updatedUser = { ...currentUser, ...input }
        setCurrentUser(updatedUser)
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
    isRestoring,
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
