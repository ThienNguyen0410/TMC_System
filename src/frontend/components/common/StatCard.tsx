import { Card, Statistic } from 'antd'
import type { ReactNode } from 'react'

export type StatCardTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

interface StatCardProps {
  title: string
  value: number | string
  icon: ReactNode
  tone?: StatCardTone
  suffix?: ReactNode
  hint?: string
}

export function StatCard({
  title,
  value,
  icon,
  tone = 'primary',
  suffix,
  hint,
}: StatCardProps) {
  return (
    <Card className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__body">
        <span className="stat-card__icon" aria-hidden="true">
          {icon}
        </span>
        <div className="stat-card__content">
          <span className="stat-card__title">{title}</span>
          <Statistic value={value} suffix={suffix} />
          {hint && <span className="stat-card__hint">{hint}</span>}
        </div>
      </div>
    </Card>
  )
}
