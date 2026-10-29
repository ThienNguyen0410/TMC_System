import { LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Dropdown, type MenuProps } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { AppUser } from '../../types/auth'
import { getInitials, getRoleLabel } from '../../utils/user'
import { ConfirmModal } from '../common/ConfirmModal'

interface UserAvatarDropdownProps {
  user: AppUser
}

export function UserAvatarDropdown({ user }: UserAvatarDropdownProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const profilePath = user.role === 'admin' ? '/admin/profile' : '/employee/profile'
  const items: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'View Profile',
      icon: <UserOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'signout',
      label: 'Sign Out',
      icon: <LogoutOutlined />,
      danger: true,
    },
  ]

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'profile') {
      navigate(profilePath)
      return
    }

    if (key === 'signout') {
      setConfirmOpen(true)
    }
  }

  const handleSignOut = () => {
    setConfirmOpen(false)
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <Dropdown
        menu={{ items, onClick: handleMenuClick }}
        trigger={['click']}
        placement="bottomRight"
      >
        <button type="button" className="user-menu" aria-label="Open account menu">
          <Avatar size={38} style={{ backgroundColor: user.avatarColor }}>
            {getInitials(user.fullName)}
          </Avatar>
          <span className="user-menu__meta">
            <span className="user-menu__name">{user.fullName}</span>
            <span className="user-menu__role">{getRoleLabel(user.role)}</span>
          </span>
        </button>
      </Dropdown>
      <ConfirmModal
        open={confirmOpen}
        title="Sign out of TMC Attendance?"
        description={
          <p>
            You are signed in as <strong>{user.fullName}</strong>. You will need to sign in again
            to access your attendance records.
          </p>
        }
        confirmText="Sign out"
        danger
        onConfirm={handleSignOut}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
