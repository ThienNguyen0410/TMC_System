import type { ReportRepository } from '../../modules/report/report.repository.ts'
import type {
  AttendanceReportQuery,
  AttendanceSourceRow,
} from '../../modules/report/report.types.ts'
import type { InMemoryDatabase } from './in-memory-database.ts'

export class InMemoryReportRepository implements ReportRepository {
  private readonly database: InMemoryDatabase

  constructor(database: InMemoryDatabase) {
    this.database = database
  }

  async findAttendanceRows(query: AttendanceReportQuery): Promise<AttendanceSourceRow[]> {
    return [...this.database.attendanceRecords.values()]
      .filter((record) => record.workDate >= query.from && record.workDate <= query.to)
      .filter((record) => !query.departmentId || record.departmentId === query.departmentId)
      .map((record) => ({
        employeeId: record.employeeId,
        departmentId: record.departmentId,
        workDate: record.workDate,
        status: record.status,
      }))
  }
}
