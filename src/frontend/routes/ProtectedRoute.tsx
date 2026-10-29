import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types/auth'

interface ProtectedRouteProps {
  role: UserRole
  children: ReactNode
}

export function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (currentUser.role !== role) {
    return (
      <Navigate
        to={currentUser.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'}
        replace
      />
    )
  }

  return <>{children}</>
}
