import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  StopOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Alert, App as AntdApp, Button, Card, DatePicker, Select, Space } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { AttendanceTable } from '../../components/attendance/AttendanceTable'
import { StatCard } from '../../components/common/StatCard'
import {
  downloadAttendanceReportCsv,
  fetchAttendanceReport,
  type ReportFilter,
} from '../../services/report.api'
import type { AttendanceRecord, AttendanceStatus } from '../../types/attendance'
import { attendanceStatusOptions, computeEmployeeSummary } from '../../utils/attendance'

const { RangePicker } = DatePicker
const API_DATE_FORMAT = 'YYYY-MM-DD'
// Mirrors the backend limit on a report range (inclusive days).
const MAX_RANGE_DAYS = 366
// A stable empty array: AttendanceTable re-filters whenever its `records` prop changes identity.
const NO_RECORDS: AttendanceRecord[] = []

interface LoadedReport {
  filter: ReportFilter
  records: AttendanceRecord[]
  error?: string
}

export default function AttendanceStatisticsPage() {
  const { message } = AntdApp.useApp()
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [dayjs().subtract(6, 'day'), dayjs()])
  const [status, setStatus] = useState<AttendanceStatus | undefined>(undefined)
  const [report, setReport] = useState<LoadedReport | null>(null)
  // The records left after the table's own search box; the summary cards follow it.
  const [visibleRecords, setVisibleRecords] = useState<AttendanceRecord[]>([])
  const [exporting, setExporting] = useState(false)

  const filter = useMemo<ReportFilter>(
    () => ({
      startDate: range[0].format(API_DATE_FORMAT),
      endDate: range[1].format(API_DATE_FORMAT),
      status,
    }),
    [range, status],
  )

  // Loading until the report on screen was fetched for the current filter.
  const loading = report?.filter !== filter
  const records = report?.records ?? NO_RECORDS

  useEffect(() => {
    const controller = new AbortController()

    fetchAttendanceReport(filter, controller.signal)
      .then((loaded) => setReport({ filter, records: loaded }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setReport({
          filter,
          records: NO_RECORDS,
          error: error instanceof Error ? error.message : 'Unable to load attendance records.',
        })
      })

    return () => controller.abort()
  }, [filter])

  const employeeCount = useMemo(
    () => new Set(records.map((record) => record.employeeId)).size,
    [records],
  )
  const summary = useMemo(() => computeEmployeeSummary(visibleRecords), [visibleRecords])

  const handleExport = async () => {
    setExporting(true)
    try {
      await downloadAttendanceReportCsv(filter)
      message.success('Attendance report downloaded.')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to export the report.')
    } finally {
      setExporting(false)
    }
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
          value={employeeCount}
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
              Pick a date range and status. Export downloads the same range and status; the search
              box only narrows the table.
            </div>
          </div>
        }
        extra={
          <Space wrap>
            <RangePicker
              value={range}
              allowClear={false}
              format="DD/MM/YYYY"
              disabledDate={(date, { from }) =>
                date.isAfter(dayjs(), 'day') ||
                (from !== undefined && Math.abs(date.diff(from, 'day')) >= MAX_RANGE_DAYS)
              }
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setRange([dates[0], dates[1]])
                }
              }}
            />
            <Select
              style={{ minWidth: 150 }}
              placeholder="All statuses"
              value={status}
              onChange={setStatus}
              options={attendanceStatusOptions}
              allowClear
            />
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exporting}
              disabled={loading || records.length === 0}
            >
              Export CSV
            </Button>
          </Space>
        }
      >
        {report?.error && (
          <Alert type="error" showIcon message={report.error} style={{ marginBottom: 16 }} />
        )}
        <AttendanceTable
          records={records}
          mode="admin"
          pageSize={10}
          onFilteredChange={setVisibleRecords}
          serverFiltered
          loading={loading}
        />
      </Card>
    </>
  )
}
