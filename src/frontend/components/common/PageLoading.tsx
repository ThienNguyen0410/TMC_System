import { Spin } from 'antd'

interface PageLoadingProps {
  tip?: string
}

export function PageLoading({ tip = 'Loading your workspace...' }: PageLoadingProps) {
  return (
    <div className="page-loading">
      <Spin size="large" />
      <span>{tip}</span>
    </div>
  )
}
