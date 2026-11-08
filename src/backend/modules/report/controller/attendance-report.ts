import type { Request, Response } from 'express'
import type { AttendanceReportFilter, AttendanceReportRow } from '../domain/attendance-report.ts'
import { formatAttendanceCsv } from '../service/attendance-csv.ts'
import type { AttendanceReportService } from '../service/attendance-report.service.ts'
import { parseAttendanceReportQuery } from './attendance-report-query.ts'

export class AttendanceReportController {
  private readonly reportService: AttendanceReportService
  private readonly today: () => string

  constructor(reportService: AttendanceReportService, today: () => string) {
    this.reportService = reportService
    this.today = today
  }

  async list(request: Request, response: Response): Promise<void> {
    const { filter, records } = await this.load(request)

    response.status(200).json({ data: { filter, records } })
  }

  async exportCsv(request: Request, response: Response): Promise<void> {
    const { filter, records } = await this.load(request)

    response
      .status(200)
      .type('text/csv; charset=utf-8')
      // The dates are validated YYYY-MM-DD, so they are safe inside a header.
      .set(
        'Content-Disposition',
        `attachment; filename="tmc-attendance-report-${filter.startDate}_${filter.endDate}.csv"`,
      )
      .send(formatAttendanceCsv(records))
  }

  private async load(
    request: Request,
  ): Promise<{ filter: AttendanceReportFilter; records: AttendanceReportRow[] }> {
    const filter = parseAttendanceReportQuery(request.query, this.today())

    return { filter, records: await this.reportService.getRows(filter) }
  }
}
