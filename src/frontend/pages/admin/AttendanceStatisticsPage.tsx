import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  StopOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { App as AntdApp, Button, Card } from 'antd'
import { useMemo, useState } from 'react'
import { AttendanceTable } from '../../components/attendance/AttendanceTable'
import { StatCard } from '../../components/common/StatCard'
import { useAuth } from '../../hooks/useAuth'
import { mockAttendanceRecords } from '../../mocks/attendance'
import { computeEmployeeSummary } from '../../mocks/statistics'
import type { AttendanceRecord } from '../../types/attendance'
import { exportAttendanceCsv } from '../../utils/csv'

export default function AttendanceStatisticsPage() {
  const { users } = useAuth()
  const { message } = AntdApp.useApp()
  const [visibleRecords, setVisibleRecords] = useState<AttendanceRecord[]>(mockAttendanceRecords)

  const employees = useMemo(() => users.filter((user) => user.role === 'employee'), [users])
  const summary = useMemo(() => computeEmployeeSummary(visibleRecords), [visibleRecords])

  const handleExport = () => {
    if (visibleRecords.length === 0) {
      return
    }

    exportAttendanceCsv(visibleRecords)
    message.success(`Exported ${visibleRecords.length} attendance records to CSV.`)
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administration</span>
          <h2>Employee attendance statistics</h2>
          <p>
            Search, filter, and analyze attendance records across the whole company. Summary cards
            update with the current table filters.
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          title="Total Employees"
          value={employees.length}
          icon={<TeamOutlined />}
          tone="primary"
          hint={`${visibleRecords.length} records in view`}
        />
        <StatCard
          title="Present Records"
          value={summary.present}
          icon={<CheckCircleOutlined />}
          tone="success"
          hint="On-time attendance entries"
        />
        <StatCard
          title="Late Arrivals"
          value={summary.late}
          icon={<ClockCircleOutlined />}
          tone="warning"
          hint="After scheduled start time"
        />
        <StatCard
          title="Absences"
          value={summary.absent}
          icon={<StopOutlined />}
          tone="danger"
          hint={`${summary.incomplete} incomplete records`}
        />
      </div>

      <Card
        className="panel-card statistics-table-card"
        title={
          <div>
            All attendance records
            <div className="panel-card__subtitle">
              Filter by employee, status, or date range. Export uses the current filtered view.
            </div>
          </div>
        }
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={visibleRecords.length === 0}
          >
            Export CSV
          </Button>
        }
      >
        <AttendanceTable
          records={mockAttendanceRecords}
          mode="admin"
          pageSize={10}
          onFilteredChange={setVisibleRecords}
        />
      </Card>
    </>
  )
}
