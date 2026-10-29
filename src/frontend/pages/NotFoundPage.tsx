import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function NotFoundPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const destination = currentUser
    ? currentUser.role === 'admin'
      ? '/admin/dashboard'
      : '/employee/dashboard'
    : '/login'

  return (
    <div className="not-found">
      <Result
        status="404"
        title="Page not found"
        subTitle="The page you are looking for does not exist or has moved."
        extra={
          <Button type="primary" onClick={() => navigate(destination, { replace: true })}>
            {currentUser ? 'Back to dashboard' : 'Back to sign in'}
          </Button>
        }
      />
    </div>
  )
}
