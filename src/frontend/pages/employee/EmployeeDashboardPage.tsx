import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  QrcodeOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { Alert, Button, Card, Tag } from 'antd'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AttendanceTable } from '../../components/attendance/AttendanceTable'
import { QRCodeModal } from '../../components/common/QRCodeModal'
import { StatCard } from '../../components/common/StatCard'
import { useAuth } from '../../hooks/useAuth'
import { getEmployeeAttendance } from '../../mocks/attendance'
import { computeEmployeeSummary } from '../../mocks/statistics'
import { getGreeting } from '../../utils/date'

export default function EmployeeDashboardPage() {
  const { currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [qrOpen, setQrOpen] = useState(() =>
    Boolean((location.state as { showQr?: boolean } | null)?.showQr),
  )

  if (!currentUser) {
    return null
  }

  const records = getEmployeeAttendance(currentUser.id)
  const summary = computeEmployeeSummary(records)
  const firstName = currentUser.fullName.trim().split(/\s+/).pop() ?? currentUser.fullName

  return (
    <>
      <section className="page-hero employee-hero">
        <div>
          <span className="eyebrow">Employee workspace</span>
          <h2>
            {getGreeting()}, {firstName}.
          </h2>
          <p>
            Review your attendance history, keep an eye on your working hours, and open your
            personal QR code whenever you need to check in.
          </p>
          <div className="page-hero__meta">
            <Tag>{currentUser.id}</Tag>
            <span>{currentUser.department}</span>
            <span>
              <strong>{summary.totalRecords}</strong> attendance records
            </span>
            <span>
              <strong>{summary.incomplete}</strong> incomplete
            </span>
          </div>
        </div>
        <div className="page-hero__actions">
          <Button
            type="primary"
            size="large"
            icon={<QrcodeOutlined />}
            onClick={() => setQrOpen(true)}
          >
            Show Attendance QR Code
          </Button>
        </div>
      </section>

      <div className="stat-grid">
        <StatCard
          title="Present Days"
          value={summary.present}
          icon={<CheckCircleOutlined />}
          tone="success"
          hint="On-time attendance"
        />
        <StatCard
          title="Late Arrivals"
          value={summary.late}
          icon={<ClockCircleOutlined />}
          tone="warning"
          hint="Recorded after shift start"
        />
        <StatCard
          title="Absent Days"
          value={summary.absent}
          icon={<StopOutlined />}
          tone="danger"
          hint="Missed workdays"
        />
        <StatCard
          title="Total Working Hours"
          value={summary.totalHours.toFixed(1)}
          suffix="h"
          icon={<FieldTimeOutlined />}
          tone="primary"
          hint="Across all recorded days"
        />
      </div>

      {records.length === 0 && (
        <Alert
          type="info"
          showIcon
          title="No attendance records yet"
          description="Your account is ready. Scan your personal QR code at the office kiosk to record your first attendance entry."
          action={
            <Button size="small" onClick={() => navigate('/kiosk')}>
              Open kiosk
            </Button>
          }
        />
      )}

      <Card
        className="panel-card"
        title={
          <div>
            My attendance records
            <div className="panel-card__subtitle">
              Search, filter, and sort your attendance history.
            </div>
          </div>
        }
        extra={
          <Button icon={<QrcodeOutlined />} onClick={() => setQrOpen(true)}>
            QR code
          </Button>
        }
      >
        <AttendanceTable records={records} mode="employee" />
      </Card>

      <QRCodeModal open={qrOpen} user={currentUser} onClose={() => setQrOpen(false)} />
    </>
  )
}
