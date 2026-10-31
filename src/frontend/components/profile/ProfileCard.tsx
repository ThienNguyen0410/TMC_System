import { EditOutlined, QrcodeOutlined } from '@ant-design/icons'
import { Avatar, Badge, Button, Card, Descriptions, Tag } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import type { AppUser } from '../../types/auth'
import { getInitials, getRoleLabel } from '../../utils/user'
import { QRCodeModal } from '../common/QRCodeModal'
import { EditProfileModal } from './EditProfileModal'

interface ProfileCardProps {
  user: AppUser
}

export function ProfileCard({ user }: ProfileCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const isEmployee = user.role === 'employee'

  return (
    <>
      <div className="profile-layout">
        <Card className="profile-summary">
          <Avatar size={88} style={{ backgroundColor: user.avatarColor }} className="profile-summary__avatar">
            {getInitials(user.fullName)}
          </Avatar>
          <h3>{user.fullName}</h3>
          <span className="profile-summary__username">@{user.username}</span>
          <div className="profile-summary__tags">
            <Tag color={isEmployee ? 'blue' : 'purple'}>{getRoleLabel(user.role)}</Tag>
            <Tag>{user.department}</Tag>
          </div>
          <div className="profile-summary__meta">
            <div>
              <span>Employee ID</span>
              <strong className="mono">{user.id}</strong>
            </div>
            <div>
              <span>Account status</span>
              <Badge status="success" text="Active" />
            </div>
          </div>
          <div className="profile-summary__actions">
            {isEmployee && (
              <Button icon={<QrcodeOutlined />} onClick={() => setQrOpen(true)}>
                Attendance QR
              </Button>
            )}
          </div>
        </Card>

        <Card
          className="panel-card profile-details"
          title={
            <div>
              Personal information
              <div className="panel-card__subtitle">
                Your account details as registered in TMC Attendance.
              </div>
            </div>
          }
        >
          <Descriptions
            column={{ xs: 1, sm: 1, md: 2 }}
            items={[
              {
                key: 'fullName',
                label: 'Full Name',
                children: user.fullName,
              },
              {
                key: 'username',
                label: 'Username',
                children: `@${user.username}`,
              },
              {
                key: 'email',
                label: 'Email',
                children: user.email,
              },
              {
                key: 'phone',
                label: 'Phone Number',
                children: user.phone,
              },
              {
                key: 'dateOfBirth',
                label: 'Date of Birth',
                children: dayjs(user.dateOfBirth).format('DD MMMM YYYY'),
              },
              {
                key: 'role',
                label: 'Role',
                children: (
                  <Tag color={isEmployee ? 'blue' : 'purple'}>{getRoleLabel(user.role)}</Tag>
                ),
              },
              {
                key: 'department',
                label: 'Department',
                children: user.department,
              },
              {
                key: 'id',
                label: 'Employee ID',
                children: <span className="mono">{user.id}</span>,
              },
            ]}
          />
          <p className="profile-note">
            This profile is mock data stored in the browser. Editing it updates the demonstration
            only and does not call a backend service.
          </p>
        </Card>
      </div>

      <EditProfileModal open={editOpen} user={user} onClose={() => setEditOpen(false)} />
      {isEmployee && <QRCodeModal open={qrOpen} user={user} onClose={() => setQrOpen(false)} />}
    </>
  )
}
