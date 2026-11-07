import type { Server } from 'node:http'
import { pool } from '../database/config.ts'
// Keep env after the pool import: that import is what loads .env.
import { env } from './config/env.ts'
import { AuthController } from './modules/user/controller/auth.ts'
import { PostgresAuthRepository } from './modules/user/repository/postgres-auth.repository.ts'
import { todayIn } from './modules/report/domain/report-dates.ts'
import { AttendanceReportController } from './modules/report/controller/attendance-report.ts'
import { PostgresAttendanceReportRepository } from './modules/report/repository/postgres-attendance-report.repository.ts'
import { createReportRoutes } from './modules/report/routes/report.routes.ts'
import { AttendanceReportService } from './modules/report/service/attendance-report.service.ts'
import { createAuthRoutes } from './modules/user/routes/auth.routes.ts'
import { AuthService } from './modules/user/service/auth.service.ts'
import { createHttpServer } from './shared/http/http-server.ts'
import type { Route } from './shared/http/http.types.ts'

export const createApp = (): Server => {
  const authRepository = new PostgresAuthRepository(pool)
  const authService = new AuthService(authRepository)
  const authController = new AuthController(authService)

  const today = () => todayIn(env.reportTimeZone)
  const reportRepository = new PostgresAttendanceReportRepository(pool, env.reportTimeZone)
  const reportService = new AttendanceReportService(reportRepository, env.reportLateAfter, today)
  const reportController = new AttendanceReportController(reportService, today)

  const routes: Route[] = [
    ...createAuthRoutes(authController),
    ...createReportRoutes(reportController),
    {
      method: 'GET',
      path: '/api/health',
      handler: async () => ({ status: 200, body: { data: { status: 'ok' } } }),
    },
  ]

  return createHttpServer(routes)
}
