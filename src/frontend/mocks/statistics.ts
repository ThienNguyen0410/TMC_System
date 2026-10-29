import dayjs from 'dayjs'
import type { AppUser } from '../types/auth'
import type {
  AttendanceRecord,
  AttendanceStats,
  DailyTrendPoint,
  EmployeeAttendanceSummary,
} from '../types/attendance'
import { todayIso } from '../utils/date'

export function computeTodayStats(
  records: AttendanceRecord[],
  employees: AppUser[],
): AttendanceStats {
  const today = todayIso()
  const todayRecords = records.filter((record) => record.date === today)
  const present = todayRecords.filter((record) => record.status === 'present').length
  const late = todayRecords.filter((record) => record.status === 'late').length
  const incomplete = todayRecords.filter((record) => record.status === 'incomplete').length
  const absentRecords = todayRecords.filter((record) => record.status === 'absent').length
  const recordedEmployeeIds = new Set(todayRecords.map((record) => record.employeeId))
  const missingEmployees = employees.filter((employee) => !recordedEmployeeIds.has(employee.id))
  const absent = absentRecords + missingEmployees.length
  const totalEmployees = employees.length

  return {
    totalEmployees,
    present,
    late,
    absent,
    incomplete,
    attendanceRate: totalEmployees === 0 ? 0 : Math.round(((present + late) / totalEmployees) * 100),
  }
}

export function getRecentActivity(records: AttendanceRecord[], limit = 6): AttendanceRecord[] {
  return records.slice(0, limit)
}

export function buildDailyTrend(records: AttendanceRecord[], days = 7): DailyTrendPoint[] {
  const today = dayjs()
  const trend: DailyTrendPoint[] = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = today.subtract(offset, 'day')
    const dateString = date.format('YYYY-MM-DD')
    const dayRecords = records.filter((record) => record.date === dateString)
    const present = dayRecords.filter((record) => record.status === 'present').length
    const late = dayRecords.filter((record) => record.status === 'late').length
    const absent = dayRecords.filter((record) => record.status === 'absent').length
    const incomplete = dayRecords.filter((record) => record.status === 'incomplete').length

    trend.push({
      date: dateString,
      label: date.format('ddd'),
      present,
      late,
      absent,
      incomplete,
      total: dayRecords.length,
    })
  }

  return trend
}

export function computeEmployeeSummary(records: AttendanceRecord[]): EmployeeAttendanceSummary {
  return {
    present: records.filter((record) => record.status === 'present').length,
    late: records.filter((record) => record.status === 'late').length,
    absent: records.filter((record) => record.status === 'absent').length,
    incomplete: records.filter((record) => record.status === 'incomplete').length,
    totalHours:
      Math.round(
        records.reduce((total, record) => total + (record.workingHours ?? 0), 0) * 100,
      ) / 100,
    totalRecords: records.length,
  }
}
