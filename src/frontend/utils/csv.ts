import dayjs from 'dayjs'
import type { AttendanceRecord } from '../types/attendance'
import { attendanceStatusMeta } from './attendance'
import { formatTime, formatWorkingHours } from './date'

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportAttendanceCsv(records: AttendanceRecord[]): void {
  const headers = [
    'Employee ID',
    'Full Name',
    'Username',
    'Department',
    'Date',
    'Check-in Time',
    'Check-out Time',
    'Attendance Status',
    'Working Hours',
  ]

  const rows = records.map((record) => [
    record.employeeId,
    record.employeeName,
    record.username,
    record.department,
    record.date,
    formatTime(record.checkIn),
    formatTime(record.checkOut),
    attendanceStatusMeta[record.status].label,
    formatWorkingHours(record.workingHours),
  ])

  const content = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvValue(String(cell))).join(','))
    .join('\r\n')

  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `tmc-attendance-statistics-${dayjs().format('YYYYMMDD-HHmm')}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
