import { QrcodeOutlined } from '@ant-design/icons'

interface BrandLogoProps {
  compact?: boolean
  invert?: boolean
}

export function BrandLogo({ compact = false, invert = false }: BrandLogoProps) {
  const classNames = ['brand-logo']

  if (invert) {
    classNames.push('brand-logo--invert')
  }

  if (compact) {
    classNames.push('brand-logo--compact')
  }

  return (
    <div className={classNames.join(' ')}>
      <span className="brand-logo__mark" aria-hidden="true">
        <QrcodeOutlined />
      </span>
      {!compact && (
        <span className="brand-logo__text">
          <strong>TMC Attendance</strong>
          <small>Workforce management</small>
        </span>
      )}
    </div>
  )
}
