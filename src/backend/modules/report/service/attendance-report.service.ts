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

  async getRows(filter: AttendanceReportFilter): Promise<AttendanceReportRow[]> {
    const range: DateRange = { startDate: filter.startDate, endDate: filter.endDate }
    const [employees, activity] = await Promise.all([
      this.repository.listEmployees(),
      this.repository.listDailyActivity(range),
    ])
    const employeeById = new Map(employees.map((employee) => [employee.id, employee]))

    const rows = [
      ...activity.map((entry) =>
        this.toRow(entry, employeeById.get(entry.employeeId) ?? unknownEmployee(entry.employeeId)),
      ),
      ...this.absentRows(employees, activity, range),
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
    employees: ReportEmployee[],
    activity: DailyActivity[],
    range: DateRange,
  ): AttendanceReportRow[] {
    const lastDate = range.endDate < this.today() ? range.endDate : this.today()
    if (range.startDate > lastDate) {
      return []
    }

    const seen = new Set(activity.map((entry) => `${entry.employeeId}|${entry.date}`))
    const rows: AttendanceReportRow[] = []

    for (const date of eachDate({ startDate: range.startDate, endDate: lastDate })) {
      if (isWeekend(date)) {
        continue
      }
      for (const employee of employees) {
        if (employee.isActive && !seen.has(`${employee.id}|${date}`)) {
          rows.push(this.toRow({ employeeId: employee.id, date, checkIn: null, checkOut: null }, employee))
        }
      }
    }

    return rows
  }
}
