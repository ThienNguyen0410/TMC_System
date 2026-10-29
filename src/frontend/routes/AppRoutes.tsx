import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PageLoading } from '../components/common/PageLoading'
import { useAuth } from '../hooks/useAuth'
import AdminLayout from '../layouts/AdminLayout'
import EmployeeLayout from '../layouts/EmployeeLayout'
import { ProtectedRoute } from './ProtectedRoute'

const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const SignUpPage = lazy(() => import('../pages/auth/SignUpPage'))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'))
const KioskPage = lazy(() => import('../pages/kiosk/KioskPage'))
const EmployeeDashboardPage = lazy(() => import('../pages/employee/EmployeeDashboardPage'))
const EmployeeProfilePage = lazy(() => import('../pages/employee/EmployeeProfilePage'))
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'))
const AdminProfilePage = lazy(() => import('../pages/admin/AdminProfilePage'))
const AttendanceStatisticsPage = lazy(() => import('../pages/admin/AttendanceStatisticsPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

function HomeRedirect() {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return (
    <Navigate
      to={currentUser.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'}
      replace
    />
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/kiosk" element={<KioskPage />} />

        <Route
          path="/employee"
          element={
            <ProtectedRoute role="employee">
              <EmployeeLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<EmployeeDashboardPage />} />
          <Route path="profile" element={<EmployeeProfilePage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="statistics" element={<AttendanceStatisticsPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
