import { Button, Empty } from 'antd'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  image?: ReactNode
}

export function EmptyState({
  title = 'Nothing to show yet',
  description = 'There are no records that match the current view.',
  actionLabel,
  onAction,
  image,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Empty image={image ?? Empty.PRESENTED_IMAGE_SIMPLE} description={false}>
        <div className="empty-state__copy">
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
        {actionLabel && onAction && (
          <Button size="small" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </Empty>
    </div>
  )
}
