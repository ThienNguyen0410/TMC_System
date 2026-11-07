import type { Route } from '../../../shared/http/http.types.ts'
import type { AttendanceReportController } from '../controller/attendance-report.ts'

export const createReportRoutes = (controller: AttendanceReportController): Route[] => [
  {
    method: 'GET',
    path: '/api/reports/attendance',
    handler: (request) => controller.list(request),
  },
  {
    method: 'GET',
    path: '/api/reports/attendance/export',
    handler: (request) => controller.exportCsv(request),
  },
]
