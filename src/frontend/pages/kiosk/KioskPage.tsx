import {
  CameraOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  DisconnectOutlined,
  ExclamationCircleFilled,
  QrcodeOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Tag } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../../components/common/BrandLogo'
import { useClock } from '../../hooks/useClock'
import { useAuth } from '../../hooks/useAuth'
import { useQrScanner } from '../../hooks/useQrScanner'
import { AttendanceApiError, submitAttendanceScan } from '../../services/attendance.api'
import type { AttendanceEventType, AttendanceLocationPayload } from '../../types/attendance'
import { formatClock, formatDisplayDate, formatKioskDate } from '../../utils/date'
import { getCurrentLocation } from '../../utils/geolocation'
import { getInitials } from '../../utils/user'

const QR_SCANNER_ELEMENT_ID = 'kiosk-qr-scanner'

const KIOSK_GATE_ID = (() => {
  const rawGateId = import.meta.env.VITE_KIOSK_GATE_ID as string | undefined

  if (!rawGateId) {
    return null
  }

  const gateId = Number(rawGateId)
  return Number.isInteger(gateId) && gateId > 0 ? gateId : null
})()

type KioskMode =
  | 'scanning'
  | 'success'
  | 'invalid'
  | 'failed'
  | 'permission-denied'
  | 'unavailable'

interface ScanResult {
  employeeName: string
  employeeCode: string
  department: string | null
  eventType: AttendanceEventType
  date: string
  time: string
}

interface ResultPanelProps {
  mode: Exclude<KioskMode, 'scanning'>
  result: ScanResult | null
  errorMessage: string | null
  onRetry: () => void
}

function ResultPanel({ mode, result, errorMessage, onRetry }: ResultPanelProps) {
  if (mode === 'success' && result) {
    const firstName = result.employeeName.trim().split(/\s+/).pop() ?? result.employeeName
    const isCheckIn = result.eventType === 'CHECK_IN'
    const eventLabel = isCheckIn ? 'Check-in' : 'Check-out'

    return (
      <div className="kiosk-result kiosk-result--success" aria-live="polite">
        <span className="kiosk-result__icon">
          <CheckCircleFilled />
        </span>
        <span className="kiosk-result__eyebrow">{eventLabel} recorded</span>
        <h2>Welcome, {firstName}.</h2>
        <p className="kiosk-result__message">
          Attendance recorded successfully at {result.time}.{' '}
          {isCheckIn ? 'Have a productive day.' : 'See you next time.'}
        </p>
        <div className="kiosk-result__card">
          <Avatar size={46} style={{ backgroundColor: '#2563eb' }}>
            {getInitials(result.employeeName)}
          </Avatar>
          <div className="kiosk-result__identity">
            <strong>{result.employeeName}</strong>
            <span>
              {result.employeeCode}
              {result.department ? ` · ${result.department}` : ''}
            </span>
          </div>
          <Tag color={isCheckIn ? 'green' : 'blue'}>{eventLabel}</Tag>
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
          {errorMessage ??
            'This code is invalid, expired, or has already been used. Please present a freshly generated attendance QR code.'}
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
        <h2>Attendance was not recorded</h2>
        <p className="kiosk-result__message">
          {errorMessage ??
            'We could not complete the attendance request. Hold the code steady and try again.'}
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
        No working camera was detected. Check the camera connection and try again.
      </p>
      <div className="kiosk-result__actions">
        <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  )
}

export default function KioskPage() {
  const now = useClock()
  const { currentUser } = useAuth()
  const exitPath = currentUser
    ? currentUser.role === 'admin'
      ? '/admin/dashboard'
      : '/employee/dashboard'
    : '/login'
  const [mode, setMode] = useState<KioskMode>('scanning')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const locationRef = useRef<AttendanceLocationPayload | null>(null)

  const handleDecodedQr = useCallback(async (decodedText: string) => {
    const token = decodedText.trim()

    if (!token) {
      setErrorMessage('The scanned QR code did not contain an attendance token.')
      setMode('invalid')
      return
    }

    setErrorMessage(null)
    const location = locationRef.current

    try {
      const attendance = await submitAttendanceScan({
        token,
        gateId: KIOSK_GATE_ID,
        location,
      })
      const recordedAt = dayjs(attendance.recordedAt)

      setResult({
        employeeName: attendance.employeeName,
        employeeCode: attendance.employeeCode,
        department: attendance.department,
        eventType: attendance.eventType,
        date: recordedAt.format('YYYY-MM-DD'),
        time: recordedAt.format('HH:mm'),
      })
      setMode('success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to record attendance.'
      setErrorMessage(message)

      if (error instanceof AttendanceApiError && error.code === 'INVALID_QR_CODE') {
        setMode('invalid')
        return
      }

      setMode('failed')
    }
  }, [])

  const handleScannerError = useCallback((scannerError: string) => {
    setMode(scannerError === 'permission-denied' ? 'permission-denied' : 'unavailable')
  }, [])

  const { startScanner, stopScanner, isScanning } = useQrScanner({
    elementId: QR_SCANNER_ELEMENT_ID,
    onScanSuccess: handleDecodedQr,
    onError: handleScannerError,
  })

  useEffect(() => {
    if (mode !== 'scanning') return

    // Delay the start by one tick so React Strict Mode does not open the camera twice.
    const startTimer = window.setTimeout(() => {
      void startScanner()
    }, 0)

    return () => {
      window.clearTimeout(startTimer)
      void stopScanner()
    }
  }, [mode, startScanner, stopScanner])

  useEffect(() => {
    if (mode !== 'scanning') return

    let active = true
    locationRef.current = null

    void getCurrentLocation().then((location) => {
      if (active) {
        locationRef.current = location
      }
    })

    return () => {
      active = false
    }
  }, [mode])

  const handleRetry = () => {
    setResult(null)
    setErrorMessage(null)
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
              Camera feed · Live
            </span>
            <span className="kiosk-camera__badge kiosk-camera__badge--muted">TMC Entrance</span>
          </div>

          {mode === 'scanning' ? (
            <div className="kiosk-scanner kiosk-scanner--live">
              <div className="kiosk-scanner__viewport">
                <div id={QR_SCANNER_ELEMENT_ID} className="kiosk-scanner__camera" />
                <span className="kiosk-scanner__line" aria-hidden="true" />
              </div>
              <span className="kiosk-scanner__status">
                <i className="kiosk-scanner__pulse" />
                {isScanning ? 'Scanning for QR code' : 'Starting camera…'}
              </span>
              <strong className="kiosk-scanner__title">Hold your QR code inside the frame</strong>
              <span className="kiosk-scanner__hint">
                The scanner detects your code automatically and sends it to the attendance server.
              </span>
            </div>
          ) : (
            <ResultPanel
              mode={mode}
              result={result}
              errorMessage={errorMessage}
              onRetry={handleRetry}
            />
          )}
        </section>

        <div className="kiosk-demo">
          <div className="kiosk-demo__label">
            <strong>Demo controls</strong>
            <span>Simulate scanner states for UI testing.</span>
          </div>
          <div className="kiosk-demo__actions">
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
        TMC Attendance Kiosk · Live camera mode · Attendance events are recorded by the TMC server
      </footer>
    </div>
  )
}
