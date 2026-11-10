import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  QrcodeOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { Alert, Button, Card, Tag } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AttendanceTable } from '../../components/attendance/AttendanceTable'
import { QRCodeModal } from '../../components/common/QRCodeModal'
import { StatCard } from '../../components/common/StatCard'
import { useAuth } from '../../hooks/useAuth'
import { fetchMyAttendance, type ReportFilter } from '../../services/report.api'
import type { AttendanceRecord } from '../../types/attendance'
import { computeEmployeeSummary } from '../../utils/attendance'
import { getGreeting } from '../../utils/date'

const REPORT_DAYS = 30
const NO_RECORDS: AttendanceRecord[] = []

interface LoadedEmployeeReport {
  filter: ReportFilter
  records: AttendanceRecord[]
  error?: string
}

export default function EmployeeDashboardPage() {
  const { currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [qrOpen, setQrOpen] = useState(() =>
    Boolean((location.state as { showQr?: boolean } | null)?.showQr),
  )
  const [report, setReport] = useState<LoadedEmployeeReport | null>(null)
  const range = useMemo<ReportFilter>(
    () => ({
      startDate: dayjs().subtract(REPORT_DAYS - 1, 'day').format('YYYY-MM-DD'),
      endDate: dayjs().format('YYYY-MM-DD'),
    }),
    [],
  )

  useEffect(() => {
    const controller = new AbortController()

    fetchMyAttendance(range, controller.signal)
      .then((records) => setReport({ filter: range, records }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        setReport({
          filter: range,
          records: NO_RECORDS,
          error: error instanceof Error ? error.message : 'Unable to load attendance records.',
        })
      })

    return () => controller.abort()
  }, [range])

  const loading = report?.filter !== range
  const records = report?.records ?? NO_RECORDS
  const summary = useMemo(() => computeEmployeeSummary(records), [records])

  if (!currentUser) {
    return null
  }

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

      {report?.error && (
        <Alert
          type="error"
          showIcon
          title="Unable to load attendance records"
          description={report.error}
        />
      )}

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
          hint={`Across the last ${REPORT_DAYS} days`}
        />
      </div>

      {!report?.error && records.length === 0 && (
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
        <AttendanceTable records={records} mode="employee" loading={loading} />
      </Card>

      <QRCodeModal open={qrOpen} user={currentUser} onClose={() => setQrOpen(false)} />
    </>
  )
}
