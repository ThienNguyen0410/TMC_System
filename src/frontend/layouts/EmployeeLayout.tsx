import { DashboardOutlined, UserOutlined } from '@ant-design/icons'
import { Outlet } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import type { AppNavItem } from '../types/navigation'

const employeeNavItems: AppNavItem[] = [
  {
    key: '/employee/dashboard',
    label: 'Dashboard',
    path: '/employee/dashboard',
    icon: <DashboardOutlined />,
  },
  {
    key: '/employee/profile',
    label: 'My Profile',
    path: '/employee/profile',
    icon: <UserOutlined />,
  },
]

export default function EmployeeLayout() {
  return (
    <AppLayout navItems={employeeNavItems} roleLabel="Employee workspace">
      <Outlet />
    </AppLayout>
  )
}
