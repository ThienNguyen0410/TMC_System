import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyActivity, ReportEmployee } from '../domain/attendance-report.ts'
import { InMemoryAttendanceReportRepository } from '../testing/in-memory-attendance-report.repository.ts'
import { AttendanceReportService } from './attendance-report.service.ts'

const TODAY = '2026-11-06' // a Friday

const employee = (id: string, fullName: string, isActive = true): ReportEmployee => ({
  id,
  fullName,
  username: fullName.toLowerCase().replace(/\s+/g, ''),
  department: 'IT',
  isActive,
})

const A = employee('1', 'Nguyen Van A')
const B = employee('2', 'Tran B')
const C = employee('3', 'Le C', false)

const day = (employeeId: string, date: string, checkIn: string | null, checkOut: string | null) =>
  ({ employeeId, date, checkIn, checkOut }) satisfies DailyActivity

const serviceWith = (employees: ReportEmployee[], activity: DailyActivity[] = []) =>
  new AttendanceReportService(
    new InMemoryAttendanceReportRepository(employees, activity),
    '09:00:00',
    () => TODAY,
  )

const oneDay = (date: string) => ({ startDate: date, endDate: date })

test('builds a present row with working hours from activity', async () => {
  const rows = await serviceWith([A, B], [day('1', '2026-11-02', '08:55:00', '17:30:00')]).getRows(
    oneDay('2026-11-02'),
  )

  assert.deepEqual(rows[0], {
    employeeId: '1',
    fullName: 'Nguyen Van A',
    username: 'nguyenvana',
    department: 'IT',
    date: '2026-11-02',
    checkIn: '08:55:00',
    checkOut: '17:30:00',
    status: 'present',
    workingHours: 8.58,
  })
})

test('generates absent rows for active employees on weekdays with no activity', async () => {
  const rows = await serviceWith([A, B, C]).getRows(oneDay('2026-11-02'))

  assert.deepEqual(
    rows.map((row) => [row.employeeId, row.status]),
    [
      ['1', 'absent'],
      ['2', 'absent'],
    ],
  )
})

test('generates no absent rows for weekends, future dates, or inactive employees', async () => {
  const rows = await serviceWith([A, B, C]).getRows({
    startDate: '2026-11-02',
    endDate: '2026-11-09',
  })

  assert.equal(rows.length, 10)
  assert.ok(rows.every((row) => row.status === 'absent' && row.employeeId !== '3'))
  assert.deepEqual([...new Set(rows.map((row) => row.date))], [
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
    '2026-11-06',
  ])
})

test('still lists real activity of an inactive employee and on a weekend', async () => {
  const rows = await serviceWith(
    [A, B, C],
    [day('3', '2026-11-04', '23:30:00', null), day('1', '2026-11-07', '09:00:00', null)],
  ).getRows({ startDate: '2026-11-04', endDate: '2026-11-07' })

  assert.ok(rows.some((row) => row.employeeId === '3' && row.status === 'incomplete'))
  assert.ok(rows.some((row) => row.employeeId === '1' && row.date === '2026-11-07'))
  assert.equal(rows.filter((row) => row.date === '2026-11-07').length, 1)
})

test('keeps activity of an unknown employee id with blank name fields', async () => {
  const rows = await serviceWith([A], [day('99', '2026-11-02', '08:00:00', '17:00:00')]).getRows(
    oneDay('2026-11-02'),
  )

  const orphan = rows.find((row) => row.employeeId === '99')
  assert.equal(orphan?.fullName, '')
  assert.equal(orphan?.username, '')
  assert.equal(orphan?.department, '')
  assert.equal(orphan?.status, 'present')
})

test('applies the status filter after status is derived', async () => {
  const service = serviceWith([A, B], [day('1', '2026-11-02', '08:55:00', '17:30:00')])

  const absent = await service.getRows({ ...oneDay('2026-11-02'), status: 'absent' })
  assert.deepEqual(
    absent.map((row) => row.employeeId),
    ['2'],
  )

  const present = await service.getRows({ ...oneDay('2026-11-02'), status: 'present' })
  assert.deepEqual(
    present.map((row) => row.employeeId),
    ['1'],
  )
})

test('returns an empty array when nothing matches', async () => {
  const rows = await serviceWith([A, B]).getRows({
    startDate: '2026-11-07',
    endDate: '2026-11-08',
  })

  assert.deepEqual(rows, [])
})

test('sorts by date, then full name, then employee id', async () => {
  const twin9 = employee('9', 'Same Name')
  const twin10 = employee('10', 'Same Name')
  const rows = await serviceWith(
    [twin10, twin9, A],
    [day('9', '2026-11-03', '08:00:00', '17:00:00')],
  ).getRows({ startDate: '2026-11-02', endDate: '2026-11-03' })

  assert.deepEqual(
    rows.map((row) => `${row.date} ${row.employeeId}`),
    [
      '2026-11-02 1',
      '2026-11-02 9',
      '2026-11-02 10',
      '2026-11-03 1',
      '2026-11-03 9',
      '2026-11-03 10',
    ],
  )
})
