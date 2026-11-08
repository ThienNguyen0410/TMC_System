import { MailOutlined, SendOutlined } from '@ant-design/icons'
import { Alert, Button, Form, Input, Result, Space } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { requestPasswordReset } from '../../services/auth.api'

interface ForgotPasswordFormValues {
  email: string
}

export default function ForgotPasswordPage() {
  const [form] = Form.useForm<ForgotPasswordFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    const email = values.email.trim()
    setSubmitting(true)
    setError(null)

    try {
      await requestPasswordReset(email)
      setSubmittedEmail(email)
      setSent(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to send the email.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSent(false)
    setError(null)
    setSubmittedEmail('')
    form.resetFields()
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter the email address linked to your employee account and we will email you a link to reset your password."
      footer={
        <span>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </span>
      }
    >
      {sent ? (
        <div className="auth-result">
          <Result
            status="success"
            title="Check your inbox"
            subTitle={`If ${submittedEmail} belongs to an account, we sent a password reset link to it.`}
            extra={
              <Space direction="vertical" size={8}>
                <Button type="primary" onClick={() => navigate('/login')}>
                  Back to Sign In
                </Button>
                <Button type="link" onClick={resetForm}>
                  Use a different email
                </Button>
              </Space>
            }
          />
          <p className="auth-note">
            The link can be used once. If it has expired, request a new one from this page.
          </p>
        </div>
      ) : (
        <>
          {error && (
            <Alert
              className="auth-alert"
              type="error"
              showIcon
              title="Could not send the email"
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
              label="Email address"
              name="email"
              rules={[
                { required: true, message: 'Please enter your email address.' },
                { type: 'email', message: 'Please enter a valid email address.' },
              ]}
            >
              <Input
                size="large"
                prefix={<MailOutlined />}
                placeholder="employee01@example.com"
                autoComplete="email"
                allowClear
              />
            </Form.Item>
            <div className="auth-form__actions">
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={submitting}
                icon={<SendOutlined />}
                block
              >
                Send reset link
              </Button>
            </div>
          </Form>
        </>
      )}
    </AuthLayout>
  )
}
