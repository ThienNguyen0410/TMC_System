import type { DailyActivity, DateRange, ReportEmployee } from '../domain/attendance-report.ts'
import type { AttendanceReportRepository } from '../repository/attendance-report.repository.ts'

// Test double that honours the AttendanceReportRepository contract (inclusive range).
export class InMemoryAttendanceReportRepository implements AttendanceReportRepository {
  private readonly employees: ReportEmployee[]
  private readonly activity: DailyActivity[]

  constructor(employees: ReportEmployee[], activity: DailyActivity[] = []) {
    this.employees = employees
    this.activity = activity
  }

  async listEmployees(): Promise<ReportEmployee[]> {
    return this.employees
  }

  async listDailyActivity(range: DateRange): Promise<DailyActivity[]> {
    return this.activity.filter(
      (entry) => entry.date >= range.startDate && entry.date <= range.endDate,
    )
  }
}
