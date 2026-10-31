import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MailOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  App as AntdApp,
  Avatar,
  Badge,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  type TableProps,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { ConfirmModal } from '../../components/common/ConfirmModal'
import { EmptyState } from '../../components/common/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import type { AppUser } from '../../types/auth'
import { delay } from '../../utils/async'
import { getInitials, getRoleLabel } from '../../utils/user'

type ManagementModal = 'view' | 'update' | 'delete'

interface ManagementFormValues {
  fullName: string
  email: string
  phone: string
  department: string
  dateOfBirth: Dayjs
}

function displayValue(value: string): string {
  return value.trim() === '' ? 'Not provided' : value
}

function formatDateOfBirth(value: string): string {
  return value ? dayjs(value).format('DD/MM/YYYY') : 'Not provided'
}

export default function ManagementPage() {
  const { users, updateProfile, deleteUser } = useAuth()
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm<ManagementFormValues>()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [modalMode, setModalMode] = useState<ManagementModal | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const employees = useMemo(() => users.filter((user) => user.role === 'employee'), [users])

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return employees
    }

    return employees.filter((employee) =>
      [
        employee.id,
        employee.fullName,
        employee.username,
        employee.email,
        employee.phone,
        employee.department,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [employees, searchQuery])

  useEffect(() => {
    if (modalMode === 'update' && selectedUser) {
      form.setFieldsValue({
        fullName: selectedUser.fullName,
        email: selectedUser.email,
        phone: selectedUser.phone,
        department: selectedUser.department,
        dateOfBirth: dayjs(selectedUser.dateOfBirth),
      })
    }
  }, [form, modalMode, selectedUser])

  const openModal = (user: AppUser, mode: ManagementModal) => {
    setSelectedUser(user)
    setModalMode(mode)
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedUser(null)
  }

  const handleUpdate = async (values: ManagementFormValues) => {
    if (!selectedUser) {
      return
    }

    setSaving(true)
    await delay(350)

    const updated = updateProfile(selectedUser.id, {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      department: values.department.trim(),
      dateOfBirth: values.dateOfBirth.format('YYYY-MM-DD'),
    })

    setSaving(false)

    if (!updated) {
      message.error('The employee account could not be updated. Please try again.')
      return
    }

    message.success(`Updated the account for ${updated.fullName}.`)
    closeModal()
  }

  const handleDelete = async () => {
    if (!selectedUser) {
      return
    }

    setDeleting(true)
    await delay(350)

    const deleted = deleteUser(selectedUser.id)
    setDeleting(false)

    if (!deleted) {
      message.error('The employee account could not be deleted. Please try again.')
      return
    }

    message.success(`Deleted the account for ${selectedUser.fullName}.`)
    closeModal()
  }

  const columns: TableProps<AppUser>['columns'] = [
    {
      title: 'Employee',
      key: 'employee',
      width: 260,
      sorter: (left, right) => left.fullName.localeCompare(right.fullName),
      render: (_, employee) => (
        <div className="management-employee">
          <Avatar
            size={38}
            className="management-employee__avatar"
            style={{ backgroundColor: employee.avatarColor }}
          >
            {getInitials(employee.fullName)}
          </Avatar>
          <span>
            <strong>{employee.fullName}</strong>
            <span>@{employee.username}</span>
          </span>
        </div>
      ),
    },
    {
      title: 'Employee ID',
      dataIndex: 'id',
      key: 'id',
      width: 130,
      sorter: (left, right) => left.id.localeCompare(right.id),
      render: (value: string) => <span className="mono">{value}</span>,
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 180,
      sorter: (left, right) => left.department.localeCompare(right.department),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 230,
      render: (value: string) => <span className="text-muted">{displayValue(value)}</span>,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (value: string) => <span className="text-muted">{displayValue(value)}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: () => <Tag color="blue">{getRoleLabel('employee')}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 240,
      render: (_, employee) => (
        <Space size={0} className="management-actions">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openModal(employee, 'view')}
          >
            View
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openModal(employee, 'update')}
          >
            Update
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => openModal(employee, 'delete')}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administration</span>
          <h2>Management</h2>
          <p>Review employee accounts and keep their information up to date.</p>
        </div>
        <div className="page-heading__actions">
          <Tag color="blue" className="management-count">
            <TeamOutlined /> {employees.length} employees
          </Tag>
        </div>
      </div>

      <Card
        className="panel-card management-card"
        title={
          <div>
            Employee accounts
            <div className="panel-card__subtitle">
              View, update, or delete an employee account with the actions in the table.
            </div>
          </div>
        }
      >
        <div className="management-toolbar">
          <Input
            className="management-toolbar__search"
            prefix={<SearchOutlined />}
            placeholder="Search by name, username, ID, email, phone, or department"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            allowClear
          />
          <div className="management-toolbar__meta">
            <span>
              Showing <strong>{filteredEmployees.length}</strong> of {employees.length} employees
            </span>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => setSearchQuery('')}
              disabled={!searchQuery}
            >
              Reset
            </Button>
          </div>
        </div>

        <Table
          rowKey="id"
          className="management-table"
          columns={columns}
          dataSource={filteredEmployees}
          scroll={{ x: 1320 }}
          pagination={{
            pageSize: 8,
            showSizeChanger: true,
            pageSizeOptions: [5, 8, 10, 20],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} employees`,
          }}
          locale={{
            emptyText: (
              <EmptyState
                title="No employees found"
                description={
                  searchQuery
                    ? 'No employee accounts match your search. Try a different keyword.'
                    : 'Employee accounts will appear here after they are registered.'
                }
                actionLabel={searchQuery ? 'Clear search' : undefined}
                onAction={searchQuery ? () => setSearchQuery('') : undefined}
              />
            ),
          }}
        />
      </Card>

      <Modal
        open={modalMode === 'view'}
        title="Employee account details"
        centered
        width={680}
        onCancel={closeModal}
        footer={<Button onClick={closeModal}>Close</Button>}
      >
        {selectedUser && (
          <div className="management-view">
            <div className="management-view__identity">
              <Avatar
                size={58}
                style={{ backgroundColor: selectedUser.avatarColor }}
                className="management-view__avatar"
              >
                {getInitials(selectedUser.fullName)}
              </Avatar>
              <div>
                <h3>{selectedUser.fullName}</h3>
                <span>
                  @{selectedUser.username} · {selectedUser.department}
                </span>
              </div>
              <Tag color="blue" className="management-view__role">
                {getRoleLabel(selectedUser.role)}
              </Tag>
            </div>

            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 1, md: 2 }}
              items={[
                {
                  key: 'id',
                  label: 'Employee ID',
                  children: <span className="mono">{selectedUser.id}</span>,
                },
                {
                  key: 'username',
                  label: 'Username',
                  children: `@${selectedUser.username}`,
                },
                {
                  key: 'email',
                  label: 'Email',
                  children: displayValue(selectedUser.email),
                },
                {
                  key: 'phone',
                  label: 'Phone',
                  children: displayValue(selectedUser.phone),
                },
                {
                  key: 'department',
                  label: 'Department',
                  children: selectedUser.department,
                },
                {
                  key: 'dateOfBirth',
                  label: 'Date of Birth',
                  children: formatDateOfBirth(selectedUser.dateOfBirth),
                },
                {
                  key: 'role',
                  label: 'Role',
                  children: <Tag color="blue">{getRoleLabel(selectedUser.role)}</Tag>,
                },
                {
                  key: 'status',
                  label: 'Account Status',
                  children: <Badge status="success" text="Active" />,
                },
              ]}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={modalMode === 'update'}
        title="Update employee account"
        centered
        width={620}
        okText="Save changes"
        cancelText="Cancel"
        confirmLoading={saving}
        onOk={() => form.submit()}
        onCancel={closeModal}
      >
        <Form
          form={form}
          layout="vertical"
          className="management-form"
          requiredMark={false}
          onFinish={handleUpdate}
        >
          <Form.Item
            label="Full Name"
            name="fullName"
            rules={[
              { required: true, message: 'Please enter the employee full name.' },
              { min: 2, message: 'Full name must be at least 2 characters.' },
            ]}
          >
            <Input size="large" prefix={<UserOutlined />} />
          </Form.Item>

          <div className="management-form__grid">
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please enter the employee email.' },
                { type: 'email', message: 'Please enter a valid email address.' },
              ]}
            >
              <Input size="large" prefix={<MailOutlined />} />
            </Form.Item>

            <Form.Item
              label="Phone Number"
              name="phone"
              rules={[
                { required: true, message: 'Please enter the employee phone number.' },
                {
                  pattern: /^(0|\+84)\d{9}$/,
                  message: 'Enter a valid Vietnamese phone number, e.g. 0901234567.',
                },
              ]}
            >
              <Input size="large" prefix={<PhoneOutlined />} />
            </Form.Item>

            <Form.Item
              label="Department"
              name="department"
              rules={[{ required: true, message: 'Please enter the employee department.' }]}
            >
              <Input size="large" prefix={<ApartmentOutlined />} />
            </Form.Item>

            <Form.Item
              label="Date of Birth"
              name="dateOfBirth"
              rules={[
                { required: true, message: 'Please select the employee date of birth.' },
                {
                  validator: (_, value: Dayjs | undefined) => {
                    if (!value || !value.isAfter(dayjs(), 'day')) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('Date of birth cannot be in the future.'))
                  },
                },
              ]}
            >
              <DatePicker size="large" format="DD/MM/YYYY" disabledDate={(current) => current.isAfter(dayjs(), 'day')} />
            </Form.Item>
          </div>

          <p className="management-form__hint">
            Username and role cannot be changed from this screen.
          </p>
        </Form>
      </Modal>

      <ConfirmModal
        open={modalMode === 'delete'}
        title="Delete employee account?"
        description={
          selectedUser && (
            <p>
              You are about to delete <strong>{selectedUser.fullName}</strong> (@
              {selectedUser.username}). This employee account will no longer appear in the
              management table.
            </p>
          )
        }
        confirmText="Delete account"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={closeModal}
      />
    </>
  )
}
