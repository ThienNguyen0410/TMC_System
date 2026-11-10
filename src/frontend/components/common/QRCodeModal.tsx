import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Modal, Progress, Spin, Tag } from 'antd'
import { QRCodeCanvas } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { createAttendanceQrCode } from '../../services/attendance.api'
import type { AppUser } from '../../types/auth'
import type { AttendanceQrCode } from '../../types/attendance'
import { getCurrentLocation } from '../../utils/geolocation'

interface QRCodeModalProps {
  open: boolean
  user: AppUser
  onClose: () => void
}

export function QRCodeModal({ open, user, onClose }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrCode, setQrCode] = useState<AttendanceQrCode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    if (!open) {
      setQrCode(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false

    setLoading(true)
    setError(null)
    setQrCode(null)

    void (async () => {
      const location = await getCurrentLocation()

      try {
        const created = await createAttendanceQrCode(location)

        if (!cancelled) {
          setQrCode(created)
          setNow(Date.now())
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not generate a QR code. Please try again.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [generation, open])

  useEffect(() => {
    if (!qrCode) {
      return
    }

    const timer = window.setInterval(() => setNow(Date.now()), 200)

    return () => window.clearInterval(timer)
  }, [qrCode])

  const regenerate = () => setGeneration((value) => value + 1)

  const remainingMs = qrCode
    ? Math.max(0, new Date(qrCode.expiresAt).getTime() - now)
    : 0
  const expired = qrCode !== null && remainingMs <= 0
  const secondsLeft = Math.ceil(remainingMs / 1000)
  const percent = qrCode
    ? Math.min(100, Math.round((remainingMs / (qrCode.expiresInSeconds * 1000)) * 100))
    : 0

  const handleDownload = () => {
    const canvas = canvasRef.current

    if (!canvas || !qrCode || expired) {
      return
    }

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `tmc-attendance-qr-${user.username}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Modal
      open={open}
      centered
      width={480}
      title="My attendance QR code"
      onCancel={onClose}
      footer={[
        <Button key="regenerate" icon={<ReloadOutlined />} onClick={regenerate} disabled={loading}>
          New code
        </Button>,
        <Button
          key="download"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
          disabled={!qrCode || expired}
        >
          Download QR code
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>,
      ]}
    >
      <div className="qr-modal">
        {loading && (
          <div className="qr-modal__loading">
            <Spin />
            <span>Requesting a one-time QR code...</span>
          </div>
        )}

        {error && (
          <Alert
            type="error"
            showIcon
            title="Could not create a QR code"
            description={error}
            action={
              <Button size="small" onClick={regenerate}>
                Try again
              </Button>
            }
          />
        )}

        {qrCode && (
          <>
            <div className={`qr-modal__frame${expired ? ' qr-modal__frame--expired' : ''}`}>
              <QRCodeCanvas
                ref={canvasRef}
                value={qrCode.token}
                size={224}
                level="H"
                marginSize={2}
                fgColor="#0B1F3F"
                bgColor="#FFFFFF"
                title={`Attendance QR code for ${user.fullName}`}
              />
              {expired && (
                <div className="qr-modal__expired">
                  <strong>QR code expired</strong>
                  <span>Select “New code” to generate another one.</span>
                </div>
              )}
            </div>

            <div className="qr-modal__status">
              <Tag color={expired ? 'red' : secondsLeft <= 2 ? 'orange' : 'green'}>
                {expired ? 'Expired' : `Expires in ${secondsLeft}s`}
              </Tag>
              <span>
                {qrCode.location
                  ? `GPS captured (±${Math.round(qrCode.location.accuracy)} m)`
                  : 'GPS not available'}
              </span>
            </div>

            <Progress
              percent={percent}
              showInfo={false}
              size="small"
              strokeColor={expired ? '#dc2626' : percent <= 40 ? '#f59e0b' : '#16a34a'}
            />

            <div className="qr-modal__identity">
              <strong>{user.fullName}</strong>
              <span>
                @{user.username} · {user.id}
              </span>
              <small>{user.department}</small>
            </div>

            <p className="qr-modal__hint">
              This one-time code is valid for {qrCode.expiresInSeconds} seconds. Present it to the
              kiosk camera immediately.
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}
