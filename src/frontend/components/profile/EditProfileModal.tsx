import { MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons'
import { App as AntdApp, DatePicker, Form, Input, Modal } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import type { AppUser } from '../../types/auth'
import { delay } from '../../utils/async'

interface ProfileFormValues {
  fullName: string
  email: string
  phone: string
  dateOfBirth: Dayjs
}

interface EditProfileModalProps {
  open: boolean
  user: AppUser
  onClose: () => void
}

export function EditProfileModal({ open, user, onClose }: EditProfileModalProps) {
  const [form] = Form.useForm<ProfileFormValues>()
  const [saving, setSaving] = useState(false)
  const { updateProfile } = useAuth()
  const { message } = AntdApp.useApp()

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        dateOfBirth: dayjs(user.dateOfBirth),
      })
    }
  }, [open, user, form])

  const handleFinish = async (values: ProfileFormValues) => {
    setSaving(true)
    await delay(600)

    const updated = updateProfile(user.id, {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      dateOfBirth: values.dateOfBirth.format('YYYY-MM-DD'),
    })

    setSaving(false)

    if (!updated) {
      message.error('We could not update your profile. Please try again.')
      return
    }

    message.success('Profile updated successfully.')
    onClose()
  }

  return (
    <Modal
      open={open}
      centered
      title="Edit profile"
      okText="Save changes"
      cancelText="Cancel"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Form
        form={form}
        layout="vertical"
        className="auth-form profile-edit-form"
        requiredMark={false}
        onFinish={handleFinish}
      >
        <Form.Item
          label="Full Name"
          name="fullName"
          rules={[
            { required: true, message: 'Please enter your full name.' },
            { min: 2, message: 'Full name must be at least 2 characters.' },
          ]}
        >
          <Input size="large" prefix={<UserOutlined />} />
        </Form.Item>
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Please enter your email address.' },
            { type: 'email', message: 'Please enter a valid email address.' },
          ]}
        >
          <Input size="large" prefix={<MailOutlined />} />
        </Form.Item>
        <Form.Item
          label="Phone Number"
          name="phone"
          rules={[
            { required: true, message: 'Please enter your phone number.' },
            {
              pattern: /^(0|\+84)\d{9}$/,
              message: 'Enter a valid Vietnamese phone number, e.g. 0901234567.',
            },
          ]}
        >
          <Input size="large" prefix={<PhoneOutlined />} />
        </Form.Item>
        <Form.Item
          label="Date of Birth"
          name="dateOfBirth"
          rules={[
            { required: true, message: 'Please select your date of birth.' },
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
          <DatePicker
            size="large"
            format="DD/MM/YYYY"
            disabledDate={(current) => current.isAfter(dayjs(), 'day')}
          />
        </Form.Item>
        <p className="profile-edit-form__note">
          Username and role cannot be changed. Profile changes are stored in this browser for the
          demonstration.
        </p>
      </Form>
    </Modal>
  )
}
