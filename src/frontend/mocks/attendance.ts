import dayjs from 'dayjs'
import type { AttendanceRecord, AttendanceStatus } from '../types/attendance'
import { mockUsers } from './users'

const todayStatusPlan: Record<string, AttendanceStatus> = {
  'EMP-0001': 'present',
  'EMP-0002': 'late',
  'EMP-0003': 'present',
  'EMP-0004': 'absent',
  'EMP-0005': 'present',
  'EMP-0006': 'present',
  'EMP-0007': 'late',
  'EMP-0008': 'incomplete',
}

const statusPatterns: AttendanceStatus[][] = [
  ['present', 'present', 'late', 'present', 'absent', 'present', 'incomplete'],
  ['present', 'late', 'present', 'present', 'present', 'late', 'incomplete'],
  ['present', 'present', 'present', 'late', 'absent', 'present', 'present'],
  ['late', 'present', 'present', 'absent', 'present', 'present', 'incomplete'],
  ['present', 'present', 'late', 'present', 'present', 'absent', 'present'],
  ['present', 'late', 'present', 'incomplete', 'present', 'present', 'present'],
  ['present', 'present', 'present', 'late', 'present', 'absent', 'present'],
  ['present', 'incomplete', 'present', 'present', 'late', 'present', 'absent'],
]

function pseudoRandom(seed: string): number {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000
  }
  return hash / 100000
}

function resolveStatus(employeeIndex: number, offset: number): AttendanceStatus {
  const pattern = statusPatterns[employeeIndex % statusPatterns.length]
  return pattern[(offset - 1) % pattern.length]
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function buildRecord(
  employeeId: string,
  employeeName: string,
  username: string,
  department: string,
  date: string,
  status: AttendanceStatus,
  seed: string,
): AttendanceRecord {
  const startOffset = Math.floor(pseudoRandom(`${seed}-in`) * 25)
  const endOffset = Math.floor(pseudoRandom(`${seed}-out`) * 40)

  if (status === 'absent') {
    return {
      id: `ATT-${employeeId}-${date.replaceAll('-', '')}`,
      employeeId,
      employeeName,
      username,
      department,
      date,
      checkIn: null,
      checkOut: null,
      status,
      workingHours: null,
    }
  }

  const checkInMinutes = status === 'late' ? 8 * 60 + 35 + startOffset : 7 * 60 + 45 + startOffset
  const checkOutMinutes = status === 'incomplete' ? null : 17 * 60 + endOffset
  const workingHours =
    checkOutMinutes === null
      ? null
      : Math.round(((checkOutMinutes - checkInMinutes) / 60) * 100) / 100

  return {
    id: `ATT-${employeeId}-${date.replaceAll('-', '')}`,
    employeeId,
    employeeName,
    username,
    department,
    date,
    checkIn: minutesToTime(checkInMinutes),
    checkOut: checkOutMinutes === null ? null : minutesToTime(checkOutMinutes),
    status,
    workingHours,
  }
}

function buildAttendanceRecords(): AttendanceRecord[] {
  const employees = mockUsers.filter((user) => user.role === 'employee')
  const today = dayjs()
  const records: AttendanceRecord[] = []

  for (let offset = 0; offset < 30; offset += 1) {
    const date = today.subtract(offset, 'day')
    const dateString = date.format('YYYY-MM-DD')
    const isWeekend = date.day() === 0 || date.day() === 6

    if (isWeekend && offset !== 0) {
      continue
    }

    employees.forEach((employee, employeeIndex) => {
      const seed = `${employee.id}-${dateString}`
      const status =
        offset === 0
          ? todayStatusPlan[employee.id] ?? 'present'
          : resolveStatus(employeeIndex, offset)

      records.push(
        buildRecord(
          employee.id,
          employee.fullName,
          employee.username,
          employee.department,
          dateString,
          status,
          seed,
        ),
      )
    })
  }

  return records.sort(
    (left, right) =>
      right.date.localeCompare(left.date) ||
      (right.checkIn ?? '').localeCompare(left.checkIn ?? ''),
  )
}

export const mockAttendanceRecords = buildAttendanceRecords()

export function getEmployeeAttendance(employeeId: string): AttendanceRecord[] {
  return mockAttendanceRecords.filter((record) => record.employeeId === employeeId)
}
