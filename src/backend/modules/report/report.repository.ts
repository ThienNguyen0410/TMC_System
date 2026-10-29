import type { AttendanceReportQuery, AttendanceSourceRow } from './report.types.ts'

export interface ReportRepository {
  findAttendanceRows(query: AttendanceReportQuery): Promise<AttendanceSourceRow[]>
}
