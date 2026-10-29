import { MenuOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import type { AppUser } from '../../types/auth'
import type { RouteMeta } from '../../types/navigation'
import { BreadcrumbHeader } from './BreadcrumbHeader'
import { UserAvatarDropdown } from './UserAvatarDropdown'

interface AppHeaderProps {
  meta: RouteMeta
  user: AppUser
  onToggleSidebar: () => void
}

export function AppHeader({ meta, user, onToggleSidebar }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__left">
        <Button
          type="text"
          className="app-header__menu"
          icon={<MenuOutlined />}
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        />
        <div className="app-header__titles">
          <BreadcrumbHeader items={['TMC Attendance', meta.section, meta.title]} />
          <div className="app-header__title">{meta.title}</div>
        </div>
      </div>
      <div className="app-header__right">
        <div className="app-header__greeting">
          <span>Hello, {user.username}</span>
          <strong>{user.fullName}</strong>
        </div>
        <UserAvatarDropdown user={user} />
      </div>
    </header>
  )
}
