import { ValidationError } from '../../shared/errors/app-error.ts'
import type { AttendanceStatus } from '../attendance/attendance.types.ts'
import type {
  AttendanceReportDto,
  AttendanceReportQuery,
  AttendanceSourceRow,
  DailySummary,
  DepartmentSummary,
  StatusCount,
} from './report.types.ts'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'LEAVE']

interface StatusTotals {
  total: number
  present: number
  late: number
  absent: number
  leave: number
}

const createTotals = (): StatusTotals => ({
  total: 0,
  present: 0,
  late: 0,
  absent: 0,
  leave: 0,
})

const addStatus = (totals: StatusTotals, status: AttendanceStatus): void => {
  totals.total += 1
  if (status === 'PRESENT') {
    totals.present += 1
  } else if (status === 'LATE') {
    totals.late += 1
  } else if (status === 'ABSENT') {
    totals.absent += 1
  } else {
    totals.leave += 1
  }
}

const calculateAttendanceRate = (totals: StatusTotals): number => {
  if (totals.total === 0) {
    return 0
  }
  return Number((((totals.present + totals.late) / totals.total) * 100).toFixed(1))
}

export class ReportDomain {
  static generate(
    query: AttendanceReportQuery,
    rows: AttendanceSourceRow[],
    now = new Date(),
  ): AttendanceReportDto {
    if (!DATE_PATTERN.test(query.from) || !DATE_PATTERN.test(query.to)) {
      throw new ValidationError('from and to must use YYYY-MM-DD format')
    }
    if (query.from > query.to) {
      throw new ValidationError('from must be before or equal to to')
    }

    const overall = createTotals()
    const departments = new Map<string, StatusTotals>()
    const dates = new Map<string, StatusTotals>()

    for (const row of rows) {
      addStatus(overall, row.status)

      const departmentKey = row.departmentId ?? 'UNASSIGNED'
      const departmentTotals = departments.get(departmentKey) ?? createTotals()
      addStatus(departmentTotals, row.status)
      departments.set(departmentKey, departmentTotals)

      const dateTotals = dates.get(row.workDate) ?? createTotals()
      addStatus(dateTotals, row.status)
      dates.set(row.workDate, dateTotals)
    }

    const statusCounts: StatusCount[] = STATUSES.map((status) => ({
      status,
      count: rows.filter((row) => row.status === status).length,
    }))

    const byDepartment: DepartmentSummary[] = [...departments.entries()]
      .map(([departmentId, totals]) => ({
        departmentId: departmentId === 'UNASSIGNED' ? null : departmentId,
        ...totals,
        attendanceRate: calculateAttendanceRate(totals),
      }))
      .sort((left, right) => (left.departmentId ?? '').localeCompare(right.departmentId ?? ''))

    const byDate: DailySummary[] = [...dates.entries()]
      .map(([date, totals]) => ({ date, ...totals }))
      .sort((left, right) => left.date.localeCompare(right.date))

    return {
      period: {
        from: query.from,
        to: query.to,
      },
      generatedAt: now.toISOString(),
      totalRecords: overall.total,
      statusCounts,
      attendanceRate: calculateAttendanceRate(overall),
      byDepartment,
      byDate,
    }
  }
}
