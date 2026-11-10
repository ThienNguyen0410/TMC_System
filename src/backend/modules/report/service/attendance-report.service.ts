import {
  classifyAttendance,
  workingHours,
  type AttendanceReportFilter,
  type AttendanceReportRow,
  type DailyActivity,
  type DateRange,
  type ReportEmployee,
} from '../domain/attendance-report.ts'
import { eachDate, isWeekend } from '../domain/report-dates.ts'
import type { AttendanceReportRepository } from '../repository/attendance-report.repository.ts'

const collator = new Intl.Collator('vi', { numeric: true })

const compareRows = (left: AttendanceReportRow, right: AttendanceReportRow): number =>
  left.date.localeCompare(right.date) ||
  collator.compare(left.fullName, right.fullName) ||
  collator.compare(left.employeeId, right.employeeId)

const unknownEmployee = (id: string): ReportEmployee => ({
  id,
  fullName: '',
  username: '',
  department: '',
  isActive: false,
})

export class AttendanceReportService {
  private readonly repository: AttendanceReportRepository
  private readonly lateAfter: string
  private readonly today: () => string

  constructor(repository: AttendanceReportRepository, lateAfter: string, today: () => string) {
    this.repository = repository
    this.lateAfter = lateAfter
    this.today = today
  }

  async getRows(
    filter: AttendanceReportFilter,
    employeeId?: string,
  ): Promise<AttendanceReportRow[]> {
    const range: DateRange = { startDate: filter.startDate, endDate: filter.endDate }
    const [employees, activity] = await Promise.all([
      this.repository.listEmployees(),
      this.repository.listDailyActivity(range),
    ])
    const scopedEmployees =
      employeeId === undefined ? employees : employees.filter((employee) => employee.id === employeeId)
    const scopedActivity =
      employeeId === undefined ? activity : activity.filter((entry) => entry.employeeId === employeeId)
    const employeeById = new Map(scopedEmployees.map((employee) => [employee.id, employee]))

    const rows = [
      ...scopedActivity.map((entry) =>
        this.toRow(entry, employeeById.get(entry.employeeId) ?? unknownEmployee(entry.employeeId)),
      ),
      ...this.absentRows(employeeById, scopedActivity, range),
    ]

    return rows.filter((row) => !filter.status || row.status === filter.status).sort(compareRows)
  }

  private toRow(entry: DailyActivity, employee: ReportEmployee): AttendanceReportRow {
    return {
      employeeId: employee.id,
      fullName: employee.fullName,
      username: employee.username,
      department: employee.department,
      date: entry.date,
      checkIn: entry.checkIn,
      checkOut: entry.checkOut,
      status: classifyAttendance(entry.checkIn, entry.checkOut, this.lateAfter),
      workingHours: workingHours(entry.checkIn, entry.checkOut),
    }
  }

  // Active employees with no activity on a past-or-present weekday are absent.
  private absentRows(
    employeeById: Map<string, ReportEmployee>,
    activity: DailyActivity[],
    range: DateRange,
  ): AttendanceReportRow[] {
    const today = this.today()
    const lastDate = range.endDate < today ? range.endDate : today

    const seen = new Set(activity.map((entry) => `${entry.employeeId}|${entry.date}`))
    const rows: AttendanceReportRow[] = []

    for (const date of eachDate({ startDate: range.startDate, endDate: lastDate })) {
      if (isWeekend(date)) {
        continue
      }
      for (const employee of employeeById.values()) {
        if (employee.isActive && !seen.has(`${employee.id}|${date}`)) {
          rows.push(this.toRow({ employeeId: employee.id, date, checkIn: null, checkOut: null }, employee))
        }
      }
    }

    return rows
  }
}
