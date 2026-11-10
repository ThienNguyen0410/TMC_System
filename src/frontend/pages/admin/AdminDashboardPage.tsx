import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons'
import { Alert, Button, Card, Progress, Table, type TableProps } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AttendanceStatusTag } from '../../components/common/AttendanceStatusTag'
import { StatCard } from '../../components/common/StatCard'
import { AttendanceTrendChart } from '../../components/dashboard/AttendanceTrendChart'
import { fetchAttendanceReport, type ReportFilter } from '../../services/report.api'
import { fetchUsers, type ManagedUser } from '../../services/user.api'
import type { AttendanceRecord } from '../../types/attendance'
import { formatLongDate, formatShortDate, formatTime } from '../../utils/date'
import { buildDailyTrend, computeTodayStats, getRecentActivity } from '../../utils/statistics'

const TREND_DAYS = 7
const RECENT_LIMIT = 6
const API_DATE_FORMAT = 'YYYY-MM-DD'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const endDate = dayjs()
    const filter: ReportFilter = {
      startDate: endDate.subtract(TREND_DAYS - 1, 'day').format(API_DATE_FORMAT),
      endDate: endDate.format(API_DATE_FORMAT),
    }

    Promise.all([fetchUsers(controller.signal), fetchAttendanceReport(filter, controller.signal)])
      .then(([loadedUsers, loadedRecords]) => {
        if (controller.signal.aborted) {
          return
        }
        setUsers(loadedUsers)
        setRecords(loadedRecords)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setUsers([])
        setRecords([])
        setLoadError(
          error instanceof Error ? error.message : 'Unable to load dashboard data.',
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [reloadToken])

  const retryLoad = () => {
    setLoading(true)
    setLoadError(null)
    setReloadToken((current) => current + 1)
  }

  const employees = useMemo(
    () => users.filter((user) => user.role === 'employee'),
    [users],
  )
  const employeeIds = useMemo(
    () => new Set(employees.map((employee) => employee.id)),
    [employees],
  )
  const employeeRecords = useMemo(
    () => records.filter((record) => employeeIds.has(record.employeeId)),
    [employeeIds, records],
  )
  const stats = useMemo(
    () => computeTodayStats(employeeRecords, employees),
    [employeeRecords, employees],
  )
  const trend = useMemo(() => buildDailyTrend(employeeRecords, TREND_DAYS), [employeeRecords])
  const recentActivity = useMemo(
    () => getRecentActivity(employeeRecords, RECENT_LIMIT),
    [employeeRecords],
  )

  const recentColumns: TableProps<AttendanceRecord>['columns'] = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, record) => (
        <div>
          <strong className="recent-activity__name">{record.employeeName}</strong>
          <span className="recent-activity__username">@{record.username}</span>
        </div>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (value: string) => formatShortDate(value),
    },
    {
      title: 'Check-in',
      dataIndex: 'checkIn',
      key: 'checkIn',
      width: 110,
      render: (value: string | null) => formatTime(value),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (value: AttendanceRecord['status']) => <AttendanceStatusTag status={value} />,
    },
  ]

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{formatLongDate()}</span>
          <h2>Attendance overview</h2>
          <p>Monitor today&apos;s attendance and recent activity across the company.</p>
        </div>
        <div className="page-heading__actions">
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            onClick={() => navigate('/admin/statistics')}
          >
            Attendance Statistics
          </Button>
        </div>
      </div>

      {loadError && (
        <Alert
          type="error"
          showIcon
          message={loadError}
          action={
            <Button size="small" onClick={retryLoad}>
              Retry
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <div className="stat-grid">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={<TeamOutlined />}
          tone="primary"
          hint="Active employee accounts"
        />
        <StatCard
          title="Employees Present Today"
          value={stats.present}
          icon={<CheckCircleOutlined />}
          tone="success"
          hint="Checked in on time"
        />
        <StatCard
          title="Employees Late Today"
          value={stats.late}
          icon={<ClockCircleOutlined />}
          tone="warning"
          hint="Arrived after shift start"
        />
        <StatCard
          title="Employees Absent Today"
          value={stats.absent}
          icon={<UserDeleteOutlined />}
          tone="danger"
          hint="No attendance recorded"
        />
      </div>

      <div className="dashboard-grid">
        <Card
          loading={loading}
          className="panel-card"
          title={
            <div>
              Attendance trend
              <div className="panel-card__subtitle">Daily attendance mix over the last 7 days</div>
            </div>
          }
        >
          <AttendanceTrendChart data={trend} />
        </Card>
        <Card
          loading={loading}
          className="panel-card dashboard-glance"
          title={
            <div>
              Today at a glance
              <div className="panel-card__subtitle">Live overview of the selected workday</div>
            </div>
          }
        >
          <div className="glance">
            <Progress
              type="circle"
              percent={stats.attendanceRate}
              size={140}
              strokeColor="#1d4ed8"
              railColor="#e8efff"
              format={(percent) => `${percent}%`}
            />
            <span className="glance__caption">
              Attendance rate
              <small>Present and late employees today</small>
            </span>
            <div className="glance__list">
              <div className="glance__row">
                <AttendanceStatusTag status="present" />
                <strong>{stats.present}</strong>
              </div>
              <div className="glance__row">
                <AttendanceStatusTag status="late" />
                <strong>{stats.late}</strong>
              </div>
              <div className="glance__row">
                <AttendanceStatusTag status="incomplete" />
                <strong>{stats.incomplete}</strong>
              </div>
              <div className="glance__row">
                <AttendanceStatusTag status="absent" />
                <strong>{stats.absent}</strong>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card
        className="panel-card"
        title={
          <div>
            Recent attendance activity
            <div className="panel-card__subtitle">The latest check-ins recorded at the kiosk</div>
          </div>
        }
        extra={
          <Button
            type="link"
            icon={<ArrowRightOutlined />}
            iconPlacement="end"
            onClick={() => navigate('/admin/statistics')}
          >
            View all records
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={recentColumns}
          dataSource={recentActivity}
          loading={loading}
          pagination={false}
          size="middle"
          scroll={{ x: 640 }}
          className="recent-activity"
        />
      </Card>
    </>
  )
}
