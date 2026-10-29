import {
  CameraOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  DisconnectOutlined,
  ExclamationCircleFilled,
  QrcodeOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Avatar, Button } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AttendanceStatusTag } from '../../components/common/AttendanceStatusTag'
import { BrandLogo } from '../../components/common/BrandLogo'
import { useClock } from '../../hooks/useClock'
import { useAuth } from '../../hooks/useAuth'
import type { AppUser } from '../../types/auth'
import type { AttendanceStatus } from '../../types/attendance'
import { formatClock, formatDisplayDate, formatKioskDate } from '../../utils/date'
import { getInitials } from '../../utils/user'

type KioskMode =
  | 'scanning'
  | 'success'
  | 'invalid'
  | 'failed'
  | 'permission-denied'
  | 'unavailable'

interface ScanResult {
  user: AppUser
  date: string
  time: string
  status: AttendanceStatus
}

interface ResultPanelProps {
  mode: Exclude<KioskMode, 'scanning'>
  result: ScanResult | null
  onRetry: () => void
}

function ResultPanel({ mode, result, onRetry }: ResultPanelProps) {
  if (mode === 'success' && result) {
    const firstName = result.user.fullName.trim().split(/\s+/).pop() ?? result.user.fullName

    return (
      <div className="kiosk-result kiosk-result--success" aria-live="polite">
        <span className="kiosk-result__icon">
          <CheckCircleFilled />
        </span>
        <span className="kiosk-result__eyebrow">Check-in recorded</span>
        <h2>Welcome, {firstName}.</h2>
        <p className="kiosk-result__message">
          Attendance recorded successfully at {result.time}. Have a productive day.
        </p>
        <div className="kiosk-result__card">
          <Avatar size={46} style={{ backgroundColor: result.user.avatarColor }}>
            {getInitials(result.user.fullName)}
          </Avatar>
          <div className="kiosk-result__identity">
            <strong>{result.user.fullName}</strong>
            <span>
              @{result.user.username} · {result.user.id}
            </span>
          </div>
          <AttendanceStatusTag status={result.status} />
        </div>
        <span className="kiosk-result__date">{formatDisplayDate(result.date)}</span>
        <div className="kiosk-result__actions">
          <Button type="primary" size="large" icon={<QrcodeOutlined />} onClick={onRetry}>
            Scan next employee
          </Button>
        </div>
      </div>
    )
  }

  if (mode === 'invalid') {
    return (
      <div className="kiosk-result kiosk-result--danger" aria-live="polite">
        <span className="kiosk-result__icon">
          <CloseCircleFilled />
        </span>
        <span className="kiosk-result__eyebrow">Scan unsuccessful</span>
        <h2>Invalid QR code</h2>
        <p className="kiosk-result__message">
          This code is not linked to a TMC employee account. Please present your personal
          attendance QR code.
        </p>
        <div className="kiosk-result__actions">
          <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={onRetry}>
            Scan again
          </Button>
        </div>
      </div>
    )
  }

  if (mode === 'failed') {
    return (
      <div className="kiosk-result kiosk-result--warning" aria-live="polite">
        <span className="kiosk-result__icon">
          <ExclamationCircleFilled />
        </span>
        <span className="kiosk-result__eyebrow">Scan unsuccessful</span>
        <h2>QR code scanning failed</h2>
        <p className="kiosk-result__message">
          We could not read the code. Hold it steady, increase the screen brightness, and try
          again.
        </p>
        <div className="kiosk-result__actions">
          <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={onRetry}>
            Try scanning again
          </Button>
        </div>
      </div>
    )
  }

  if (mode === 'permission-denied') {
    return (
      <div className="kiosk-result kiosk-result--muted" aria-live="polite">
        <span className="kiosk-result__icon">
          <CameraOutlined />
        </span>
        <span className="kiosk-result__eyebrow">Camera unavailable</span>
        <h2>Camera permission denied</h2>
        <p className="kiosk-result__message">
          Camera access is blocked. Allow camera permission for this kiosk in the browser, then
          try again.
        </p>
        <div className="kiosk-result__actions">
          <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={onRetry}>
            Try again
          </Button>
          <Button size="large" onClick={onRetry}>
            Use demo mode
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="kiosk-result kiosk-result--muted" aria-live="polite">
      <span className="kiosk-result__icon">
        <DisconnectOutlined />
      </span>
      <span className="kiosk-result__eyebrow">Hardware check</span>
      <h2>Camera unavailable</h2>
      <p className="kiosk-result__message">
        No working camera was detected. Check the camera connection, or continue with the simulated
        scanner.
      </p>
      <div className="kiosk-result__actions">
        <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={onRetry}>
          Try again
        </Button>
        <Button size="large" onClick={onRetry}>
          Use demo mode
        </Button>
      </div>
    </div>
  )
}

export default function KioskPage() {
  const now = useClock()
  const { users, currentUser } = useAuth()
  const exitPath = currentUser
    ? currentUser.role === 'admin'
      ? '/admin/dashboard'
      : '/employee/dashboard'
    : '/login'
  const [mode, setMode] = useState<KioskMode>('scanning')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanIndex, setScanIndex] = useState(0)

  const employees = users.filter((user) => user.role === 'employee')

  const handleValidScan = () => {
    if (employees.length === 0) {
      setMode('failed')
      return
    }

    const employee = employees[scanIndex % employees.length]
    const minutesOfDay = now.getHours() * 60 + now.getMinutes()
    const status: AttendanceStatus = minutesOfDay <= 8 * 60 + 30 ? 'present' : 'late'

    setScanIndex((index) => index + 1)
    setResult({
      user: employee,
      date: dayjs(now).format('YYYY-MM-DD'),
      time: dayjs(now).format('HH:mm'),
      status,
    })
    setMode('success')
  }

  const handleRetry = () => {
    setResult(null)
    setMode('scanning')
  }

  return (
    <div className="kiosk-page">
      <header className="kiosk-topbar">
        <BrandLogo invert />
        <div className="kiosk-topbar__clock">
          <strong>{formatClock(now)}</strong>
          <span>{formatKioskDate(now)}</span>
        </div>
        <Link className="kiosk-exit" to={exitPath}>
          {currentUser ? 'Back to app' : 'Exit kiosk'}
        </Link>
      </header>

      <main className="kiosk-main">
        <div className="kiosk-heading">
          <span className="eyebrow">TMC Attendance Terminal</span>
          <h1>Attendance check-in</h1>
          <p>Position your personal QR code in front of the camera to record your attendance.</p>
        </div>

        <section className={`kiosk-camera kiosk-camera--${mode}`} aria-live="polite">
          <div className="kiosk-camera__hud">
            <span className="kiosk-camera__badge">
              <i className="kiosk-camera__live-dot" />
              Camera feed · Demo
            </span>
            <span className="kiosk-camera__badge kiosk-camera__badge--muted">TMC Entrance</span>
          </div>

          {mode === 'scanning' ? (
            <button
              type="button"
              className="kiosk-scanner"
              onClick={handleValidScan}
              aria-label="Simulate scanning an employee QR code"
            >
              <span className="kiosk-scanner__frame">
                <span className="kiosk-scanner__corner kiosk-scanner__corner--tl" />
                <span className="kiosk-scanner__corner kiosk-scanner__corner--tr" />
                <span className="kiosk-scanner__corner kiosk-scanner__corner--bl" />
                <span className="kiosk-scanner__corner kiosk-scanner__corner--br" />
                <span className="kiosk-scanner__line" />
                <QrcodeOutlined className="kiosk-scanner__placeholder" />
              </span>
              <span className="kiosk-scanner__status">
                <i className="kiosk-scanner__pulse" />
                Scanning for QR code
              </span>
              <strong className="kiosk-scanner__title">Hold your QR code inside the frame</strong>
              <span className="kiosk-scanner__hint">
                The scanner detects your code automatically. Tap the frame to simulate a valid scan.
              </span>
            </button>
          ) : (
            <ResultPanel mode={mode} result={result} onRetry={handleRetry} />
          )}
        </section>

        <div className="kiosk-demo">
          <div className="kiosk-demo__label">
            <strong>Demo controls</strong>
            <span>Simulate scanner responses for UI testing.</span>
          </div>
          <div className="kiosk-demo__actions">
            <Button size="large" onClick={handleValidScan}>
              Valid scan
            </Button>
            <Button size="large" onClick={() => setMode('invalid')}>
              Invalid QR
            </Button>
            <Button size="large" onClick={() => setMode('failed')}>
              Scan failure
            </Button>
            <Button size="large" onClick={() => setMode('permission-denied')}>
              Camera denied
            </Button>
            <Button size="large" onClick={() => setMode('unavailable')}>
              Camera unavailable
            </Button>
          </div>
        </div>
      </main>

      <footer className="kiosk-footer">
        TMC Attendance Kiosk · Camera simulation mode · No data is sent to a server
      </footer>
    </div>
  )
}
