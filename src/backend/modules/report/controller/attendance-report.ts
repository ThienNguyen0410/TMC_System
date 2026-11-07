import type { HttpRequest, HttpResponse } from '../../../shared/http/http.types.ts'
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

  async list(request: HttpRequest): Promise<HttpResponse> {
    const { filter, records } = await this.load(request)

    return { status: 200, body: { data: { filter, records } } }
  }

  async exportCsv(request: HttpRequest): Promise<HttpResponse> {
    const { filter, records } = await this.load(request)

    return {
      status: 200,
      body: formatAttendanceCsv(records),
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        // The dates are validated YYYY-MM-DD, so they are safe inside a header.
        'Content-Disposition': `attachment; filename="tmc-attendance-report-${filter.startDate}_${filter.endDate}.csv"`,
      },
    }
  }

  private async load(
    request: HttpRequest,
  ): Promise<{ filter: AttendanceReportFilter; records: AttendanceReportRow[] }> {
    const filter = parseAttendanceReportQuery(request.query, this.today())

    return { filter, records: await this.reportService.getRows(filter) }
  }
}
