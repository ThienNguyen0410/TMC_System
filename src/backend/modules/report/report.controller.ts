import type { HttpRequest, HttpResponse } from '../../shared/http/http.types.ts'
import type { ReportService } from './report.service.ts'

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export class ReportController {
  private readonly service: ReportService

  constructor(service: ReportService) {
    this.service = service
  }

  getAttendanceReport = async (request: HttpRequest): Promise<HttpResponse> => {
    const now = new Date()
    const defaultFrom = formatDate(new Date(now.getFullYear(), now.getMonth(), 1))
    const defaultTo = formatDate(now)

    const report = await this.service.getAttendanceReport({
      from: request.query.get('from') ?? defaultFrom,
      to: request.query.get('to') ?? defaultTo,
      departmentId: request.query.get('departmentId') ?? undefined,
    })

    return { status: 200, body: { data: report } }
  }
}
