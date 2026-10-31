import {
  IdcardOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import { Alert, App as AntdApp, Button, DatePicker, Form, Input, Modal, Result, Select } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { QRCodeCanvas } from 'qrcode.react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { useAuth } from '../../hooks/useAuth'
import type { AppUser } from '../../types/auth'
import { delay } from '../../utils/async'

interface SignUpFormValues {
  fullName: string
  username: string
  email: string
  phone: string
  dateOfBirth: Dayjs
  password: string
  confirmPassword: string
}

export default function SignUpPage() {
  const [form] = Form.useForm<SignUpFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registeredUser, setRegisteredUser] = useState<AppUser | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const { register } = useAuth()
  const { message } = AntdApp.useApp()
  const navigate = useNavigate()

  const handleSubmit = async (values: SignUpFormValues) => {
    setSubmitting(true)
    setError(null)
    await delay(900)

    const result = register({
      fullName: values.fullName,
      username: values.username,
      password: values.password,
      email: values.email,
      phone: values.phone,
      dateOfBirth: values.dateOfBirth.format('YYYY-MM-DD'),
    })

    if (!result.ok || !result.user) {
      if (result.field) {
        form.setFields([{ name: result.field, errors: [result.error ?? 'This value is unavailable.'] }])
      } else {
        setError(result.error ?? 'Registration failed. Please try again.')
      }
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setRegisteredUser(result.user)
    setSuccessOpen(true)
    message.success('Account created successfully.')
  }

  const handleContinue = () => {
    setSuccessOpen(false)
    navigate('/employee/dashboard', { state: { showQr: true } })
  }

  return (
    <AuthLayout
      wide
      title="Create your employee account"
      subtitle=''
      footer={
        <span>
          Already have an account? <Link to="/login">Sign in</Link>
        </span>
      }
    >
      {error && (
        <Alert
          className="auth-alert"
          type="error"
          showIcon
          title={error}
          closable
          onClose={() => setError(null)}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        className="auth-form"
        requiredMark={false}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Full Name"
          name="fullName"
          rules={[
            { required: true, message: 'Please enter your full name.' },
            { min: 2, message: 'Full name must be at least 2 characters.' },
            { max: 60, message: 'Full name must be 60 characters or fewer.' },
          ]}
        >
          <Input size="large" prefix={<IdcardOutlined />} placeholder="Nguyen Van An" />
        </Form.Item>
        <div className="auth-form__row">
          <Form.Item
            label="Username"
            name="username"
            rules={[
              { required: true, message: 'Please choose a username.' },
              {
                pattern: /^[a-zA-Z0-9._-]{4,20}$/,
                message: 'Use 4-20 letters, numbers, dots, dashes, or underscores.',
              },
            ]}
          >
            <Input size="large" prefix={<UserAddOutlined />} placeholder="employee09" />
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
            <Input size="large" prefix={<PhoneOutlined />} placeholder="0901234567" />
          </Form.Item>
        </div>

        <Form.Item
        label="Role"
        >
          <Select
          defaultValue={'employee'}
          options={[
            {value: "employee", label: "Employee"},
            {value: "admin", label: "Admin"},
            {value: "hr", label: "HR"},
            {value: "PS", label: "Production Supervisor"},
            {value: "security-guard", label: "Security Guard"},
            {value: "executive managemen", label: "Executive Management"}

          ]}
          ></Select>
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Please enter your email address.' },
            { type: 'email', message: 'Please enter a valid email address.' },
          ]}
        >
          <Input size="large" prefix={<MailOutlined />} placeholder="you@example.com" />
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
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            placeholder="Select date of birth"
            disabledDate={(current) => current.isAfter(dayjs(), 'day')}
          />
        </Form.Item>
        <div className="auth-form__row">
          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Please create a password.' },
              { min: 8, message: 'Password must be at least 8 characters.' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
                message: 'Include uppercase, lowercase, number, and symbol.',
              },
            ]}
          >
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="Create a password" />
          </Form.Item>
          <Form.Item
            label="Confirm Password"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password.' },
              ({ getFieldValue }) => ({
                validator: (_, value) => {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Passwords do not match.'))
                },
              }),
            ]}
          >
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="Repeat password" />
          </Form.Item>
        </div>
        <div className="auth-form__actions">
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            loading={submitting}
            icon={<UserAddOutlined />}
            block
          >
            Sign Up
          </Button>
        </div>
      </Form>
      <p className="auth-note">
        This registration is simulated on the frontend only. No data leaves this browser and no
        real account is created.
      </p>
      <Modal
        open={successOpen}
        centered
        width={440}
        closable={false}
        mask={{ closable: false }}
        keyboard={false}
        footer={
          <Button type="primary" size="large" block onClick={handleContinue}>
            Go to my dashboard
          </Button>
        }
      >
        <Result
          status="success"
          title="Your account is ready"
          subTitle="A personal attendance QR code has been created for you. We will open your dashboard so you can view it."
        />
        {registeredUser && (
          <div className="auth-success-qr">
            <div className="auth-success-qr__frame">
              <QRCodeCanvas
                value={registeredUser.qrCode}
                size={132}
                level="H"
                marginSize={1}
                fgColor="#0B1F3F"
                bgColor="#FFFFFF"
              />
            </div>
          </div>
        )}
      </Modal>
    </AuthLayout>
  )
}
