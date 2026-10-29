import { QrcodeOutlined } from '@ant-design/icons'
import { Layout, Menu, type MenuProps } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AppNavItem } from '../../types/navigation'
import { BrandLogo } from '../common/BrandLogo'

interface SidebarProps {
  items: AppNavItem[]
  collapsed: boolean
  roleLabel: string
  onBreakpoint: (broken: boolean) => void
  onNavigate: () => void
}

export function Sidebar({
  items,
  collapsed,
  roleLabel,
  onBreakpoint,
  onNavigate,
}: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const menuItems: MenuProps['items'] = items.map((item) => ({
    key: item.path,
    label: item.label,
    icon: item.icon,
  }))

  const activeItem = items.find(
    (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
  )

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
    onNavigate()
  }

  const handleKioskClick = () => {
    navigate('/kiosk')
    onNavigate()
  }

  return (
    <Layout.Sider
      className="app-layout__sider"
      width={260}
      collapsedWidth={0}
      collapsed={collapsed}
      trigger={null}
      breakpoint="lg"
      onBreakpoint={onBreakpoint}
    >
      <div className="sider-brand">
        <BrandLogo invert />
      </div>
      <div className="sider-workspace">
        <span>Workspace</span>
        <strong>{roleLabel}</strong>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        items={menuItems}
        selectedKeys={activeItem ? [activeItem.path] : []}
        onClick={handleMenuClick}
      />
      <div className="sider-footer">
        <button type="button" className="sider-kiosk-card" onClick={handleKioskClick}>
          <QrcodeOutlined />
          <span>
            <strong>Kiosk mode</strong>
            <small>Open attendance terminal</small>
          </span>
        </button>
      </div>
    </Layout.Sider>
  )
}
