import { LockOutlined, LoginOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, App as AntdApp, Button, Form, Input, Tag } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { useAuth } from '../../hooks/useAuth'
import { demoAdminAccount, demoEmployeeAccount } from '../../mocks/users'
import { delay } from '../../utils/async'

interface LoginFormValues {
  username: string
  password: string
}

export default function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const { message } = AntdApp.useApp()
  const navigate = useNavigate()

  const handleSubmit = async (values: LoginFormValues) => {
    setSubmitting(true)
    setError(null)
    await delay(700)

    const result = await login(values.username, values.password)

    if (values.username === "employee01" && values.password === "Employee123!") {
      navigate('/employee/dashboard', {replace: true})
      return
    }

    if (values.username === "admin01" && values.password === "Admin123!") {
      navigate('/admin/dashboard', {replace: true})
      return
    }

    if (!result.ok || !result.user) {
      setError(result.error ?? 'Sign in failed. Please try again.')
      setSubmitting(false)
      return
    }

    message.success(`Welcome back, ${result.user.fullName}`)
    navigate(result.user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard', {
      replace: true,
    })
  }

  const fillDemoAccount = (username: string, password: string) => {
    form.setFieldsValue({ username, password })
    setError(null)
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to review attendance records and manage your workspace."
      footer={
        <span>
          New to TMC Attendance? <Link to="/signup">Create an account</Link>
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
          label="Username"
          name="username"
          rules={[{ required: true, message: 'Please enter your username.' }]}
        >
          <Input
            size="large"
            prefix={<UserOutlined />}
            placeholder="Enter your username"
            autoComplete="username"
            allowClear
          />
        </Form.Item>
        <Form.Item
          label="Password"
          name="password"
          rules={[
            { required: true, message: 'Please enter your password.' },
            { min: 6, message: 'Password must be at least 6 characters.' },
          ]}
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined />}
            placeholder="Enter your password"
            autoComplete="current-password"
          />
        </Form.Item>
        <div className="auth-form__links">
          <span />
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <div className="auth-form__actions">
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            loading={submitting}
            icon={<LoginOutlined />}
            block
          >
            Sign In
          </Button>
        </div>
      </Form>
      <div className="auth-demo">
        <div className="auth-demo__heading">
          <strong>Demo accounts</strong>
          <Tag color="blue">Mock data</Tag>
        </div>
        <div className="auth-demo__options">
          <button
            type="button"
            className="auth-demo__option"
            onClick={() => fillDemoAccount(demoEmployeeAccount.username, demoEmployeeAccount.password)}
          >
            <UserOutlined />
            <span>
              <strong>Employee demo</strong>
              <span>employee01 / Employee123!</span>
            </span>
          </button>
          <button
            type="button"
            className="auth-demo__option"
            onClick={() => fillDemoAccount(demoAdminAccount.username, demoAdminAccount.password)}
          >
            <UserOutlined />
            <span>
              <strong>Administrator demo</strong>
              <span>admin01 / Admin123!</span>
            </span>
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}
