import { DownloadOutlined } from '@ant-design/icons'
import { Button, Modal } from 'antd'
import { QRCodeCanvas } from 'qrcode.react'
import { useRef } from 'react'
import type { AppUser } from '../../types/auth'

interface QRCodeModalProps {
  open: boolean
  user: AppUser
  onClose: () => void
}

export function QRCodeModal({ open, user, onClose }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) {
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
      onCancel={onClose}
      footer={[
        <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>
          Download QR code
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>,
      ]}
    >
      <div className="qr-modal">
        <div className="qr-modal__frame">
          <QRCodeCanvas
            ref={canvasRef}
            value={user.qrCode}
            size={224}
            level="H"
            marginSize={2}
            fgColor="#0B1F3F"
            bgColor="#FFFFFF"
            title={`Attendance QR code for ${user.fullName}`}
          />
        </div>
        <div className="qr-modal__identity">
          <strong>{user.fullName}</strong>
          <span>
            @{user.username} · {user.id}
          </span>
          <small>{user.department}</small>
        </div>
        <p className="qr-modal__hint">
          Present this code to the kiosk camera at the office entrance to record your attendance.
          The code is unique to your employee account.
        </p>
      </div>
    </Modal>
  )
}
