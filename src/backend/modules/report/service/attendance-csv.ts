import type { AttendanceReportRow } from '../domain/attendance-report.ts'

const HEADERS = [
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

// A leading = + - @ (or tab/CR) makes Excel and Sheets evaluate the cell as a formula.
const FORMULA_PREFIX = /^[=+\-@\t\r]/

const escapeCell = (value: string): string => {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

const statusLabel = (status: string): string => status.charAt(0).toUpperCase() + status.slice(1)

export function formatAttendanceCsv(rows: AttendanceReportRow[]): string {
  const lines = [
    HEADERS,
    ...rows.map((row) => [
      row.employeeId,
      row.fullName,
      row.username,
      row.department,
      row.date,
      row.checkIn ?? '',
      row.checkOut ?? '',
      statusLabel(row.status),
      row.workingHours === null ? '' : row.workingHours.toFixed(2),
    ]),
  ]

  // The BOM lets Excel open the file as UTF-8.
  return `﻿${lines.map((cells) => cells.map(escapeCell).join(',')).join('\r\n')}`
}
