import type { DailyActivity, DateRange, ReportEmployee } from '../domain/attendance-report.ts'

export interface AttendanceReportRepository {
  listEmployees(): Promise<ReportEmployee[]>
  // Both range ends are inclusive. One entry per employee per local day, holding the earliest
  // check-in and the latest check-out of that day.
  listDailyActivity(range: DateRange): Promise<DailyActivity[]>
}
