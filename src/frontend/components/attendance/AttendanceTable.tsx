import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, DatePicker, Input, Select, Table, type TableProps } from 'antd'
import type { Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import type { AttendanceRecord, AttendanceStatus } from '../../types/attendance'
import {
  attendanceStatusMeta,
  attendanceStatusOptions,
  getStatusOrder,
} from '../../utils/attendance'
import {
  formatDisplayDate,
  formatTime,
  formatWorkingHours,
  isDateWithinRange,
} from '../../utils/date'
import { getInitials } from '../../utils/user'
import { AttendanceStatusTag } from '../common/AttendanceStatusTag'
import { EmptyState } from '../common/EmptyState'

const { RangePicker } = DatePicker

interface AttendanceTableProps {
  records: AttendanceRecord[]
  mode: 'employee' | 'admin'
  pageSize?: number
  onFilteredChange?: (records: AttendanceRecord[]) => void
}

export function AttendanceTable({
  records,
  mode,
  pageSize = 8,
  onFilteredChange,
}: AttendanceTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return records.filter((record) => {
      if (statusFilter && record.status !== statusFilter) {
        return false
      }

      if (!isDateWithinRange(record.date, dateRange)) {
        return false
      }

      if (!query) {
        return true
      }

      const searchableValues =
        mode === 'admin'
          ? [
              record.employeeId,
              record.employeeName,
              record.username,
              record.department,
              record.date,
              attendanceStatusMeta[record.status].label,
            ]
          : [
              record.date,
              formatDisplayDate(record.date),
              record.checkIn ?? '',
              record.checkOut ?? '',
              attendanceStatusMeta[record.status].label,
            ]

      return searchableValues.join(' ').toLowerCase().includes(query)
    })
  }, [records, searchQuery, statusFilter, dateRange, mode])

  useEffect(() => {
    onFilteredChange?.(filteredRecords)
  }, [filteredRecords, onFilteredChange])

  const hasFilters = Boolean(searchQuery || statusFilter || dateRange)

  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter(undefined)
    setDateRange(null)
  }

  const columns: TableProps<AttendanceRecord>['columns'] = [
    ...(mode === 'admin'
      ? [
          {
            title: 'Employee ID',
            dataIndex: 'employeeId',
            key: 'employeeId',
            width: 130,
            sorter: (left: AttendanceRecord, right: AttendanceRecord) =>
              left.employeeId.localeCompare(right.employeeId),
            render: (value: string) => <span className="mono">{value}</span>,
          },
          {
            title: 'Full Name',
            dataIndex: 'employeeName',
            key: 'employeeName',
            width: 210,
            sorter: (left: AttendanceRecord, right: AttendanceRecord) =>
              left.employeeName.localeCompare(right.employeeName),
            render: (_: string, record: AttendanceRecord) => (
              <div className="employee-cell">
                <span className="employee-cell__avatar">{getInitials(record.employeeName)}</span>
                <span>
                  <strong>{record.employeeName}</strong>
                  <span>{record.department}</span>
                </span>
              </div>
            ),
          },
          {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
            width: 140,
            sorter: (left: AttendanceRecord, right: AttendanceRecord) =>
              left.username.localeCompare(right.username),
            render: (value: string) => <span className="text-muted">@{value}</span>,
          },
        ]
      : []),
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 185,
      defaultSortOrder: 'descend',
      sorter: (left, right) => left.date.localeCompare(right.date),
      render: (value: string) => formatDisplayDate(value),
    },
    {
      title: 'Check-in Time',
      dataIndex: 'checkIn',
      key: 'checkIn',
      width: 130,
      sorter: (left, right) => (left.checkIn ?? '').localeCompare(right.checkIn ?? ''),
      render: (value: string | null) => (
        <span className={value ? 'attendance-time' : 'attendance-time attendance-time--missing'}>
          {formatTime(value)}
        </span>
      ),
    },
    {
      title: 'Check-out Time',
      dataIndex: 'checkOut',
      key: 'checkOut',
      width: 140,
      sorter: (left, right) => (left.checkOut ?? '').localeCompare(right.checkOut ?? ''),
      render: (value: string | null) => (
        <span className={value ? 'attendance-time' : 'attendance-time attendance-time--missing'}>
          {formatTime(value)}
        </span>
      ),
    },
    {
      title: 'Attendance Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      sorter: (left, right) => getStatusOrder(left.status) - getStatusOrder(right.status),
      render: (value: AttendanceStatus) => <AttendanceStatusTag status={value} />,
    },
    {
      title: 'Working Hours',
      dataIndex: 'workingHours',
      key: 'workingHours',
      width: 140,
      sorter: (left, right) => (left.workingHours ?? 0) - (right.workingHours ?? 0),
      render: (value: number | null) => (
        <span className={value === null ? 'attendance-hours attendance-hours--missing' : 'attendance-hours'}>
          {formatWorkingHours(value)}
        </span>
      ),
    },
  ]

  return (
    <div className="attendance-table">
      <div className="attendance-toolbar">
        <Input
          className="attendance-toolbar__search"
          prefix={<SearchOutlined />}
          placeholder={
            mode === 'admin'
              ? 'Search by name, username, or employee ID'
              : 'Search by date, time, or status'
          }
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          allowClear
        />
        <Select
          className="attendance-toolbar__select"
          placeholder="All statuses"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as AttendanceStatus | undefined)}
          options={attendanceStatusOptions}
          allowClear
        />
        <RangePicker
          className="attendance-toolbar__range"
          value={dateRange}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setDateRange([dates[0], dates[1]])
              return
            }
            setDateRange(null)
          }}
          format="DD/MM/YYYY"
          placeholder={['From date', 'To date']}
        />
        <Button icon={<ReloadOutlined />} onClick={resetFilters} disabled={!hasFilters}>
          Reset
        </Button>
      </div>
      <div className="attendance-toolbar__meta">
        <span>
          Showing <strong>{filteredRecords.length}</strong> of {records.length} records
        </span>
        {statusFilter && (
          <span>Status filter: {attendanceStatusMeta[statusFilter].label}</span>
        )}
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredRecords}
        scroll={{ x: mode === 'admin' ? 1080 : 860 }}
        pagination={{
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: [5, 8, 10, 20],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`,
        }}
        locale={{
          emptyText: (
            <EmptyState
              title="No attendance records found"
              description={
                hasFilters
                  ? 'No records match your current search and filters. Try widening the date range.'
                  : 'Attendance records will appear here after the employee scans at the kiosk.'
              }
              actionLabel={hasFilters ? 'Clear filters' : undefined}
              onAction={hasFilters ? resetFilters : undefined}
            />
          ),
        }}
      />
    </div>
  )
}
