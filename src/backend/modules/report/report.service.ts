import { ReportDomain } from './report.domain.ts'
import type { ReportRepository } from './report.repository.ts'
import type { AttendanceReportDto, AttendanceReportQuery } from './report.types.ts'

export class ReportService {
  private readonly repository: ReportRepository

  constructor(repository: ReportRepository) {
    this.repository = repository
  }

  async getAttendanceReport(query: AttendanceReportQuery): Promise<AttendanceReportDto> {
    const rows = await this.repository.findAttendanceRows(query)
    return ReportDomain.generate(query, rows)
  }
}
