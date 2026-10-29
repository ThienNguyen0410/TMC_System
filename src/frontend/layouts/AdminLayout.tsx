import { BarChartOutlined, DashboardOutlined, UserOutlined } from '@ant-design/icons'
import { Outlet } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import type { AppNavItem } from '../types/navigation'

const adminNavItems: AppNavItem[] = [
  {
    key: '/admin/dashboard',
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: <DashboardOutlined />,
  },
  {
    key: '/admin/statistics',
    label: 'Attendance Statistics',
    path: '/admin/statistics',
    icon: <BarChartOutlined />,
  },
  {
    key: '/admin/profile',
    label: 'My Profile',
    path: '/admin/profile',
    icon: <UserOutlined />,
  },
]

export default function AdminLayout() {
  return (
    <AppLayout navItems={adminNavItems} roleLabel="Administration">
      <Outlet />
    </AppLayout>
  )
}
