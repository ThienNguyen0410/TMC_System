import { Layout } from 'antd'
import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { AppNavItem, RouteMeta } from '../../types/navigation'
import { PageLoading } from '../common/PageLoading'
import { AppHeader } from './AppHeader'
import { Sidebar } from './Sidebar'

const routeMetaMap: Record<string, RouteMeta> = {
  '/employee/dashboard': { section: 'Employee', title: 'Dashboard' },
  '/employee/profile': { section: 'Employee', title: 'My Profile' },
  '/admin/dashboard': { section: 'Administration', title: 'Dashboard' },
  '/admin/management': { section: 'Administration', title: 'Management' },
  '/admin/statistics': { section: 'Administration', title: 'Attendance Statistics' },
  '/admin/profile': { section: 'Administration', title: 'My Profile' },
}

interface AppLayoutProps {
  navItems: AppNavItem[]
  roleLabel: string
  children: ReactNode
}

export function AppLayout({ navItems, roleLabel, children }: AppLayoutProps) {
  const { currentUser } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() =>
    window.matchMedia('(max-width: 992px)').matches,
  )

  if (!currentUser) {
    return <PageLoading />
  }

  const meta = routeMetaMap[location.pathname] ?? {
    section: roleLabel,
    title: 'Workspace',
  }

  const handleNavigate = () => {
    if (window.matchMedia('(max-width: 992px)').matches) {
      setCollapsed(true)
    }
  }

  return (
    <Layout className="app-layout">
      {!collapsed && (
        <button
          type="button"
          className="app-layout__backdrop"
          aria-label="Close navigation"
          onClick={() => setCollapsed(true)}
        />
      )}
      <Sidebar
        items={navItems}
        collapsed={collapsed}
        roleLabel={roleLabel}
        onBreakpoint={setCollapsed}
        onNavigate={handleNavigate}
      />
      <Layout className="app-layout__body">
        <AppHeader
          meta={meta}
          user={currentUser}
          onToggleSidebar={() => setCollapsed((value) => !value)}
        />
        <main className="app-content">
          <div className="page">{children}</div>
        </main>
      </Layout>
    </Layout>
  )
}
