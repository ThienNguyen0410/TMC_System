import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AttendanceReportRow } from '../domain/attendance-report.ts'
import { formatAttendanceCsv } from './attendance-csv.ts'

const HEADER =
  'Employee ID,Full Name,Username,Department,Date,Check-in Time,Check-out Time,Attendance Status,Working Hours'

const row = (overrides: Partial<AttendanceReportRow> = {}): AttendanceReportRow => ({
  employeeId: '1',
  fullName: 'Nguyen Van A',
  username: 'nguyenvana',
  department: 'IT',
  date: '2026-11-02',
  checkIn: '08:55:00',
  checkOut: '17:30:00',
  status: 'present',
  workingHours: 8.58,
  ...overrides,
})

const lines = (csv: string) => csv.slice(1).split('\r\n')

test('starts with a BOM and the exact header, joined with CRLF', () => {
  const csv = formatAttendanceCsv([row()])

  assert.equal(csv.charAt(0), '﻿')
  assert.deepEqual(lines(csv), [
    HEADER,
    '1,Nguyen Van A,nguyenvana,IT,2026-11-02,08:55:00,17:30:00,Present,8.58',
  ])
})

test('returns the header only when there are no rows', () => {
  assert.equal(formatAttendanceCsv([]), `﻿${HEADER}`)
})

test('renders the status label, empty cells for missing times and hours', () => {
  const csv = formatAttendanceCsv([
    row({ checkIn: '09:10:00', checkOut: null, status: 'incomplete', workingHours: null }),
    row({ checkIn: null, checkOut: null, status: 'absent', workingHours: null }),
    row({ workingHours: 7.5, status: 'late' }),
  ])

  const [, incomplete, absent, late] = lines(csv)
  assert.ok(incomplete.endsWith(',09:10:00,,Incomplete,'))
  assert.ok(absent.endsWith(',,,Absent,'))
  assert.ok(late.endsWith(',Late,7.50'))
})

test('quotes cells with a comma, quote or newline and doubles inner quotes', () => {
  const csv = formatAttendanceCsv([row({ fullName: 'Tran, "Bob"\nJr', department: 'R&D' })])

  assert.ok(csv.includes('"Tran, ""Bob""\nJr"'))
  assert.ok(csv.includes(',R&D,'))
})

test('keeps Vietnamese diacritics intact', () => {
  assert.ok(formatAttendanceCsv([row({ fullName: 'Nguyễn Văn Á' })]).includes('Nguyễn Văn Á'))
})

test('neutralizes cells a spreadsheet would run as a formula', () => {
  for (const name of ['=SUM(A1)', '+1', '-1', '@cmd']) {
    const csv = formatAttendanceCsv([row({ fullName: name })])
    assert.ok(csv.includes(`,'${name},`), `${name} should be prefixed with a quote`)
  }
})
