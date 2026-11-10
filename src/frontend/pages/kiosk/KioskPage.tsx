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
import jsQR from 'jsqr'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../../components/common/BrandLogo'
import { useAuth } from '../../hooks/useAuth'
import { useClock } from '../../hooks/useClock'
import { AttendanceApiError, scanAttendanceQrCode } from '../../services/attendance.api'
import type { AttendanceEmployee, AttendanceEventType } from '../../types/attendance'
import { formatClock, formatDisplayDate, formatKioskDate } from '../../utils/date'
import { getCurrentLocation } from '../../utils/geolocation'
import { getInitials } from '../../utils/user'

type KioskMode =
  | 'scanning'
  | 'submitting'
  | 'success'
  | 'invalid'
  | 'expired'
  | 'location-mismatch'
  | 'cooldown'
  | 'failed'
  | 'permission-denied'
  | 'unavailable'

type ResultMode = Exclude<KioskMode, 'scanning' | 'submitting'>

type CameraState = 'starting' | 'ready' | 'denied' | 'unavailable'

interface ScanResult {
  employee: AttendanceEmployee
  eventType: AttendanceEventType
  recordedAt: string
}

interface ResultPanelProps {
  mode: ResultMode
  result: ScanResult | null
  message: string | null
  onRetry: () => void
}

interface FeedbackPanelProps {
  mode: Exclude<ResultMode, 'success'>
  message: string | null
  onRetry: () => void
}

const feedbackFor = (
  mode: Exclude<ResultMode, 'success'>,
  message: string | null,
): { icon: ReactNode; tone: string; eyebrow: string; title: string; copy: string } => {
  if (mode === 'invalid') {
    return {
      icon: <CloseCircleFilled />,
      tone: 'danger',
      eyebrow: 'Scan unsuccessful',
      title: 'Invalid QR code',
      copy:
        message ??
        'This code is not linked to an active employee, or it has already been used.',
    }
  }

  if (mode === 'expired') {
    return {
      icon: <ExclamationCircleFilled />,
      tone: 'warning',
      eyebrow: 'QR code expired',
      title: 'The code has expired',
      copy:
        message ??
        'Attendance QR codes are valid for 5 seconds. Ask the employee to generate a new one.',
    }
  }

  if (mode === 'location-mismatch') {
    return {
      icon: <ExclamationCircleFilled />,
      tone: 'warning',
      eyebrow: 'Location check failed',
      title: 'QR code generated elsewhere',
      copy:
        message ??
        'The QR code was generated more than 1 meter away from this kiosk, so attendance was not recorded.',
    }
  }

  if (mode === 'cooldown') {
    return {
      icon: <ExclamationCircleFilled />,
      tone: 'warning',
      eyebrow: 'Please wait',
      title: 'Attendance was just recorded',
      copy: message ?? 'Scanning again too quickly is blocked to prevent duplicate records.',
    }
  }

  if (mode === 'permission-denied') {
    return {
      icon: <CameraOutlined />,
      tone: 'muted',
      eyebrow: 'Camera unavailable',
      title: 'Camera permission denied',
      copy:
        message ??
        'Allow camera access for this kiosk in the browser, then try again. The front camera is used.',
    }
  }

  if (mode === 'unavailable') {
    return {
      icon: <DisconnectOutlined />,
      tone: 'muted',
      eyebrow: 'Hardware check',
      title: 'Camera unavailable',
      copy:
        message ??
        'No working front camera was detected. Check the camera connection or browser permissions.',
    }
  }

  return {
    icon: <ExclamationCircleFilled />,
    tone: 'warning',
    eyebrow: 'Scan unsuccessful',
    title: 'Attendance could not be recorded',
    copy: message ?? 'We could not read the code or reach the attendance server. Please try again.',
  }
}

function FeedbackPanel({ mode, message, onRetry }: FeedbackPanelProps) {
  const feedback = feedbackFor(mode, message)

  return (
    <div className={`kiosk-result kiosk-result--${feedback.tone}`} aria-live="polite">
      <span className="kiosk-result__icon">{feedback.icon}</span>
      <span className="kiosk-result__eyebrow">{feedback.eyebrow}</span>
      <h2>{feedback.title}</h2>
      <p className="kiosk-result__message">{feedback.copy}</p>
      <div className="kiosk-result__actions">
        <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={onRetry}>
          {mode === 'permission-denied' || mode === 'unavailable'
            ? 'Try camera again'
            : 'Scan again'}
        </Button>
      </div>
    </div>
  )
}

function ResultPanel({ mode, result, message, onRetry }: ResultPanelProps) {
  if (mode === 'success' && result) {
    const firstName = result.employee.fullName.trim().split(/\s+/).pop() ?? result.employee.fullName
    const recordedAt = dayjs(result.recordedAt)
    const isCheckIn = result.eventType === 'CHECK_IN'
    const time = recordedAt.isValid() ? recordedAt.format('HH:mm:ss') : result.recordedAt

    return (
      <div className="kiosk-result kiosk-result--success" aria-live="polite">
        <span className="kiosk-result__icon">
          <CheckCircleFilled />
        </span>
        <span className="kiosk-result__eyebrow">
          {isCheckIn ? 'Check-in' : 'Check-out'} recorded
        </span>
        <h2>{isCheckIn ? `Welcome, ${firstName}.` : `See you soon, ${firstName}.`}</h2>
        <p className="kiosk-result__message">
          Your attendance was recorded at {time}. {isCheckIn ? 'Have a productive day.' : ''}
        </p>
        <div className="kiosk-result__card">
          <Avatar size={46} className="kiosk-result__avatar">
            {getInitials(result.employee.fullName)}
          </Avatar>
          <div className="kiosk-result__identity">
            <strong>{result.employee.fullName}</strong>
            <span>
              @{result.employee.username} · {result.employee.id}
            </span>
            {result.employee.department && <span>{result.employee.department}</span>}
          </div>
          <Tag color={isCheckIn ? 'green' : 'blue'}>{isCheckIn ? 'Check-in' : 'Check-out'}</Tag>
        </div>
        <span className="kiosk-result__date">{formatDisplayDate(result.recordedAt)}</span>
        <div className="kiosk-result__actions">
          <Button type="primary" size="large" icon={<QrcodeOutlined />} onClick={onRetry}>
            Scan next employee
          </Button>
        </div>
      </div>
    )
  }

  return <FeedbackPanel mode={mode as Exclude<ResultMode, 'success'>} message={message} onRetry={onRetry} />
}

const modeForErrorCode = (code: string | undefined): KioskMode => {
  switch (code) {
    case 'QR_CODE_EXPIRED':
      return 'expired'
    case 'QR_LOCATION_MISMATCH':
      return 'location-mismatch'
    case 'ATTENDANCE_COOLDOWN':
      return 'cooldown'
    case 'INVALID_QR_CODE':
    case 'QR_CODE_ALREADY_USED':
      return 'invalid'
    default:
      return 'failed'
  }
}

export default function KioskPage() {
  const now = useClock()
  const { currentUser } = useAuth()
  const exitPath = currentUser
    ? currentUser.role === 'admin'
      ? '/admin/dashboard'
      : '/employee/dashboard'
    : '/login'

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)
  const [cameraState, setCameraState] = useState<CameraState>('starting')
  const [cameraAttempt, setCameraAttempt] = useState(0)
  const [mode, setMode] = useState<KioskMode>('scanning')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const video = videoRef.current

    setCameraState('starting')
    setMode('scanning')
    setResult(null)
    setMessage(null)

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('unavailable')
        setMode('unavailable')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }

        setCameraState('ready')
      } catch (error) {
        if (cancelled) {
          return
        }

        const name = error instanceof DOMException ? error.name : ''
        const denied = name === 'NotAllowedError' || name === 'PermissionDeniedError'

        setCameraState(denied ? 'denied' : 'unavailable')
        setMode(denied ? 'permission-denied' : 'unavailable')
      }
    }

    void startCamera()

    return () => {
      cancelled = true

      if (video) {
        video.srcObject = null
      }

      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [cameraAttempt])

  const requestScan = useCallback(() => {
    if (scanningRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return
    }

    const context = canvas.getContext('2d', { willReadFrequently: true })

    if (!context) {
      return
    }

    const width = video.videoWidth
    const height = video.videoHeight

    if (canvas.width !== width) {
      canvas.width = width
    }

    if (canvas.height !== height) {
      canvas.height = height
    }

    context.drawImage(video, 0, 0, width, height)

    const imageData = context.getImageData(0, 0, width, height)
    const code = jsQR(imageData.data, width, height, { inversionAttempts: 'dontInvert' })
    const token = code?.data.trim()

    if (!token) {
      return
    }

    scanningRef.current = true
    setMode('submitting')
    setMessage(null)

    void (async () => {
      try {
        const location = await getCurrentLocation(6000)
        const confirmation = await scanAttendanceQrCode(token, location)

        setResult({
          employee: confirmation.employee,
          eventType: confirmation.eventType,
          recordedAt: confirmation.recordedAt,
        })
        setMode('success')
      } catch (error) {
        const code = error instanceof AttendanceApiError ? error.code : undefined

        setMessage(error instanceof Error ? error.message : null)
        setMode(modeForErrorCode(code))
      } finally {
        scanningRef.current = false
      }
    })()
  }, [])

  useEffect(() => {
    if (cameraState !== 'ready' || mode !== 'scanning') {
      return
    }

    let frameId = 0
    let stopped = false
    let lastScan = 0

    const tick = (timestamp: number) => {
      if (stopped) {
        return
      }

      if (timestamp - lastScan >= 150) {
        lastScan = timestamp
        requestScan()
      }

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      stopped = true
      window.cancelAnimationFrame(frameId)
    }
  }, [cameraState, mode, requestScan])

  const handleRetry = () => {
    setResult(null)
    setMessage(null)

    if (cameraState !== 'ready') {
      setCameraAttempt((attempt) => attempt + 1)
      return
    }

    setMode('scanning')
  }

  const cameraLive = mode === 'scanning' || mode === 'submitting'

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
          <p>Position your personal QR code in front of the front camera to record your attendance.</p>
        </div>

        <section className={`kiosk-camera kiosk-camera--${mode}`} aria-live="polite">
          <div className="kiosk-camera__hud">
            <span className="kiosk-camera__badge">
              <i className="kiosk-camera__live-dot" />
              Camera feed · Front camera
            </span>
            <span className="kiosk-camera__badge kiosk-camera__badge--muted">
              GPS check · 1 m tolerance
            </span>
          </div>

          <video
            ref={videoRef}
            className={`kiosk-camera__video${cameraLive ? ' kiosk-camera__video--live' : ''}`}
            autoPlay
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="kiosk-camera__canvas" />

          {cameraLive ? (
            <div className="kiosk-scanner kiosk-scanner--overlay">
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
                {mode === 'submitting'
                  ? 'Recording attendance'
                  : cameraState === 'starting'
                    ? 'Starting camera'
                    : 'Scanning for QR code'}
              </span>
              <strong className="kiosk-scanner__title">
                {mode === 'submitting' ? 'Hold still while we validate the code' : 'Hold your QR code inside the frame'}
              </strong>
              <span className="kiosk-scanner__hint">
                The scanner detects your code automatically. Keep the screen brightness high.
              </span>
            </div>
          ) : (
            <ResultPanel
              mode={mode as ResultMode}
              result={result}
              message={message}
              onRetry={handleRetry}
            />
          )}
        </section>
      </main>

      <footer className="kiosk-footer">
        TMC Attendance Kiosk · Front camera scanning · Attendance is recorded in the TMC system
      </footer>
    </div>
  )
}
