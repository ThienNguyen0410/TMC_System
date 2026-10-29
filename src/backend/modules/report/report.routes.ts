import type { Route } from '../../shared/http/http.types.ts'
import type { ReportController } from './report.controller.ts'

export const createReportRoutes = (controller: ReportController): Route[] => [
  {
    method: 'GET',
    path: '/api/reports/attendance',
    handler: controller.getAttendanceReport,
  },
]
