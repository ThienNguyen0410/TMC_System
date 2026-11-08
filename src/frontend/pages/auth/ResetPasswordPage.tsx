import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { Alert, Button, Form, Input, Result } from 'antd'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { resetPassword } from '../../services/auth.api'

interface ResetPasswordFormValues {
  password: string
  confirmPassword: string
}

export default function ResetPasswordPage() {
  const [form] = Form.useForm<ResetPasswordFormValues>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    setSubmitting(true)
    setError(null)

    try {
      await resetPassword(token, values.password)
      setDone(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to reset the password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Your reset link can be used once, and signing in again is required afterwards."
      footer={
        <span>
          Need a new link? <Link to="/forgot-password">Request another email</Link>
        </span>
      }
    >
      {!token ? (
        <Alert
          className="auth-alert"
          type="error"
          showIcon
          title="This reset link is incomplete"
          description="Open the link from the email we sent you, or request a new one."
        />
      ) : done ? (
        <div className="auth-result">
          <Result
            status="success"
            title="Password updated"
            subTitle="Every existing session has been signed out. Sign in with your new password."
            extra={
              <Button type="primary" onClick={() => navigate('/login')}>
                Back to Sign In
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {error && (
            <Alert
              className="auth-alert"
              type="error"
              showIcon
              title="Could not reset the password"
              description={error}
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
              label="New Password"
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
              <Input.Password size="large" prefix={<LockOutlined />} placeholder="New password" />
            </Form.Item>
            <Form.Item
              label="Confirm New Password"
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
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="Repeat password"
              />
            </Form.Item>
            <div className="auth-form__actions">
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={submitting}
                icon={<SafetyCertificateOutlined />}
                block
              >
                Update password
              </Button>
            </div>
          </Form>
        </>
      )}
    </AuthLayout>
  )
}
