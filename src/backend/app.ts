import type { Server } from 'node:http'
import { env } from './config/env.ts'
import { HttpHRPayrollGateway } from './infrastructure/external/hr-payroll/hr-payroll-http.gateway.ts'
import { LoggingHRPayrollGateway } from './infrastructure/external/hr-payroll/logging-hr-payroll.gateway.ts'
import { InMemoryAttendanceRepository } from './infrastructure/persistence/in-memory-attendance.repository.ts'
import { InMemoryDatabase } from './infrastructure/persistence/in-memory-database.ts'
import { InMemoryReportRepository } from './infrastructure/persistence/in-memory-report.repository.ts'
import { AttendanceController } from './modules/attendance/attendance.controller.ts'
import { createAttendanceRoutes } from './modules/attendance/attendance.routes.ts'
import { AttendanceService } from './modules/attendance/attendance.service.ts'
import { ReportController } from './modules/report/report.controller.ts'
import { createReportRoutes } from './modules/report/report.routes.ts'
import { ReportService } from './modules/report/report.service.ts'
import { createHttpServer } from './shared/http/http-server.ts'
import type { Route } from './shared/http/http.types.ts'

export const createApp = (): Server => {
  const database = new InMemoryDatabase()
  const attendanceRepository = new InMemoryAttendanceRepository(database)
  const reportRepository = new InMemoryReportRepository(database)
  const hrPayroll = env.hrPayrollBaseUrl
    ? new HttpHRPayrollGateway(env.hrPayrollBaseUrl, env.hrPayrollApiKey)
    : new LoggingHRPayrollGateway()

  const attendanceService = new AttendanceService(attendanceRepository, hrPayroll)
  const reportService = new ReportService(reportRepository)
  const attendanceController = new AttendanceController(attendanceService)
  const reportController = new ReportController(reportService)

  const routes: Route[] = [
    ...createAttendanceRoutes(attendanceController),
    ...createReportRoutes(reportController),
    {
      method: 'GET',
      path: '/api/health',
      handler: async () => ({ status: 200, body: { data: { status: 'ok' } } }),
    },
  ]

  return createHttpServer(routes)
}
