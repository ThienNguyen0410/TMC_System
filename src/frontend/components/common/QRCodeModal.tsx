import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Modal, Spin } from 'antd'
import { QRCodeCanvas } from 'qrcode.react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { requestAttendanceQrCode } from '../../services/attendance.api'
import type { AppUser } from '../../types/auth'
import type { IssuedQrCode } from '../../types/attendance'

interface QRCodeModalProps {
  open: boolean
  user: AppUser
  onClose: () => void
}

type QrStatus = 'idle' | 'loading' | 'ready' | 'error'

export function QRCodeModal({ open, user, onClose }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestIdRef = useRef(0)
  const [status, setStatus] = useState<QrStatus>('idle')
  const [issuedQrCode, setIssuedQrCode] = useState<IssuedQrCode | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const issueQrCode = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setStatus('loading')
    setIssuedQrCode(null)
    setSecondsLeft(0)
    setErrorMessage('')

    try {
      const qrCode = await requestAttendanceQrCode(user.id)

      if (requestId !== requestIdRef.current) {
        return
      }

      setIssuedQrCode(qrCode)
      setSecondsLeft(qrCode.expiresInSeconds)
      setStatus('ready')
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return
      }

      setErrorMessage(error instanceof Error ? error.message : 'Unable to create a QR code.')
      setStatus('error')
    }
  }, [user.id])

  useEffect(() => {
    if (!open) {
      return
    }

    const timer = window.setTimeout(() => {
      void issueQrCode()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [issueQrCode, open])

  useEffect(() => {
    if (!open || status !== 'ready' || !issuedQrCode) {
      return
    }

    const parsedExpiry = Date.parse(issuedQrCode.expiresAt)
    const expiresAt = Number.isNaN(parsedExpiry)
      ? Date.now() + issuedQrCode.expiresInSeconds * 1000
      : parsedExpiry

    const updateCountdown = () => {
      setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)))
    }

    const timer = window.setInterval(updateCountdown, 250)

    return () => window.clearInterval(timer)
  }, [issuedQrCode, open, status])

  const expired = status === 'ready' && (!issuedQrCode || secondsLeft <= 0)

  const handleClose = () => {
    requestIdRef.current += 1
    onClose()
  }

  const handleDownload = () => {
    const canvas = canvasRef.current

    if (!canvas || expired) {
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
      width={460}
      title="My attendance QR code"
      onCancel={handleClose}
      footer={[
        <Button
          key="download"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
          disabled={!issuedQrCode || expired}
        >
          Download QR code
        </Button>,
        <Button
          key="regenerate"
          icon={<ReloadOutlined />}
          onClick={() => void issueQrCode()}
          loading={status === 'loading'}
        >
          Regenerate
        </Button>,
        <Button key="close" type="primary" onClick={handleClose}>
          Close
        </Button>,
      ]}
    >
      <div className="qr-modal">
        <div className="qr-modal__frame">
          {(status === 'idle' || status === 'loading') && (
            <div className="qr-modal__state">
              <Spin size="large" />
              <span>Creating a fresh QR code…</span>
            </div>
          )}

          {status === 'error' && (
            <div className="qr-modal__state qr-modal__state--error">
              <Alert
                type="error"
                showIcon
                title="QR code unavailable"
                description={errorMessage}
              />
            </div>
          )}

          {status === 'ready' && issuedQrCode && !expired && (
            <QRCodeCanvas
              ref={canvasRef}
              value={issuedQrCode.token}
              size={224}
              level="H"
              marginSize={2}
              fgColor="#0B1F3F"
              bgColor="#FFFFFF"
              title={`Attendance QR code for ${user.fullName}`}
            />
          )}

          {status === 'ready' && expired && (
            <div className="qr-modal__state qr-modal__state--expired">
              <strong>QR code expired</strong>
              <span>This code was valid for 5 seconds. Regenerate it to scan again.</span>
            </div>
          )}
        </div>

        {status === 'ready' && !expired && (
          <span className="qr-modal__countdown">Expires in {secondsLeft}s</span>
        )}

        <div className="qr-modal__identity">
          <strong>{user.fullName}</strong>
          <span>
            @{user.username} · {user.id}
          </span>
          <small>{user.department}</small>
        </div>
        <p className="qr-modal__hint">
          Present this code to the kiosk camera at the office entrance to record your attendance.
          Each code is single-use and expires after 5 seconds.
        </p>
      </div>
    </Modal>
  )
}
