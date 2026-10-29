import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons'
import { Button, Card, Progress, Table, type TableProps } from 'antd'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AttendanceStatusTag } from '../../components/common/AttendanceStatusTag'
import { StatCard } from '../../components/common/StatCard'
import { AttendanceTrendChart } from '../../components/dashboard/AttendanceTrendChart'
import { useAuth } from '../../hooks/useAuth'
import { mockAttendanceRecords } from '../../mocks/attendance'
import { buildDailyTrend, computeTodayStats, getRecentActivity } from '../../mocks/statistics'
import type { AttendanceRecord } from '../../types/attendance'
import { formatLongDate, formatShortDate, formatTime } from '../../utils/date'

export default function AdminDashboardPage() {
  const { users } = useAuth()
  const navigate = useNavigate()

  const employees = useMemo(() => users.filter((user) => user.role === 'employee'), [users])
  const stats = useMemo(
    () => computeTodayStats(mockAttendanceRecords, employees),
    [employees],
  )
  const trend = useMemo(() => buildDailyTrend(mockAttendanceRecords, 7), [])
  const recentActivity = useMemo(() => getRecentActivity(mockAttendanceRecords, 6), [])

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
          pagination={false}
          size="middle"
          scroll={{ x: 640 }}
          className="recent-activity"
        />
      </Card>
    </>
  )
}
