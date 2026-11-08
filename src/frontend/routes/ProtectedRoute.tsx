import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  area: 'admin' | 'employee'
  children: ReactNode
}

export function ProtectedRoute({ area, children }: ProtectedRouteProps) {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  const isAdmin = currentUser.role === 'admin'

  if (isAdmin !== (area === 'admin')) {
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/employee/dashboard'} replace />
  }

  return <>{children}</>
}
