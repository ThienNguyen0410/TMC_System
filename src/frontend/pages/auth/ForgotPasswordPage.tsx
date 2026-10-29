import { MailOutlined, SendOutlined } from '@ant-design/icons'
import { Alert, Button, Form, Input, Result, Space } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { useAuth } from '../../hooks/useAuth'
import { delay } from '../../utils/async'

interface ForgotPasswordFormValues {
  email: string
}

type RecoveryStatus = 'idle' | 'success' | 'error'

export default function ForgotPasswordPage() {
  const [form] = Form.useForm<ForgotPasswordFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<RecoveryStatus>('idle')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const { isEmailRegistered } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    setSubmitting(true)
    setStatus('idle')
    await delay(600)

    const normalizedEmail = values.email.trim()
    setSubmittedEmail(normalizedEmail)
    setStatus(isEmailRegistered(normalizedEmail) ? 'success' : 'error')
    setSubmitting(false)
  }

  const resetForm = () => {
    setStatus('idle')
    setSubmittedEmail('')
    form.resetFields()
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter the email address linked to your employee account and we will simulate sending recovery instructions."
      footer={
        <span>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </span>
      }
    >
      {status === 'success' ? (
        <div className="auth-result">
          <Result
            status="success"
            title="Recovery instructions sent"
            subTitle={`If ${submittedEmail} belongs to an account, password recovery instructions would be sent there.`}
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
            UI demonstration only: no email is sent and no password is changed.
          </p>
        </div>
      ) : (
        <>
          {status === 'error' && (
            <Alert
              className="auth-alert"
              type="error"
              showIcon
              title="No account found"
              description={`We could not find an account linked to ${submittedEmail}. Check the address and try again.`}
              closable
              onClose={() => setStatus('idle')}
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
                Send recovery instructions
              </Button>
            </div>
          </Form>
          <p className="auth-note">
            Demo email addresses include employee01@example.com and admin01@example.com.
          </p>
        </>
      )}
    </AuthLayout>
  )
}
