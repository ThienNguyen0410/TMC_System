import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  QrcodeOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { Card } from 'antd'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../common/BrandLogo'

const currentYear = new Date().getFullYear()

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function AuthLayout({ title, subtitle, children, footer, wide = false }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <aside className="auth-brand-panel">
        <BrandLogo invert />
        <div className="auth-brand-panel__content">
          <span className="eyebrow">Employee attendance platform</span>
          <h1>Attendance, made simple.</h1>
          <p>
            Check in at the kiosk in seconds, keep every workday on record, and give administrators
            a clear view of attendance across the company.
          </p>
          <ul className="auth-feature-list">
            <li>
              <QrcodeOutlined />
              <span>Touch-free QR check-in at the entrance kiosk</span>
            </li>
            <li>
              <ClockCircleOutlined />
              <span>Live attendance history with working hours</span>
            </li>
            <li>
              <SafetyCertificateOutlined />
              <span>Separate employee and administrator workspaces</span>
            </li>
          </ul>
        </div>
        <div className="auth-brand-panel__footer">
          <span>Kiosk terminal ready</span>
          <Link to="/kiosk">
            Open kiosk mode <ArrowRightOutlined />
          </Link>
        </div>
      </aside>
      <section className="auth-form-panel">
        <div className="auth-mobile-brand">
          <BrandLogo />
        </div>
        <Card className={`auth-card${wide ? ' auth-card--wide' : ''}`}>
          <div className="auth-form__header">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          {children}
          {footer && <div className="auth-form__footer">{footer}</div>}
        </Card>
        <p className="auth-copyright">
          © {currentYear} TMC Attendance · Internal demonstration environment
        </p>
      </section>
    </div>
  )
}
