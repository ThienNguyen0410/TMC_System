import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { pool } from '../database/config.ts'
import { env } from './config/env.ts'
import { NodemailerPasswordResetMailer } from './infrastructure/external/mail/nodemailer-password-reset-mailer.ts'
import { AttendanceReportController } from './modules/report/controller/attendance-report.ts'
import { todayIn } from './modules/report/domain/report-dates.ts'
import { PostgresAttendanceReportRepository } from './modules/report/repository/postgres-attendance-report.repository.ts'
import { createReportRouter } from './modules/report/routes/report.routes.ts'
import { AttendanceReportService } from './modules/report/service/attendance-report.service.ts'
import { AuthController } from './modules/user/controller/auth.ts'
import { PostgresAuthRepository } from './modules/user/repository/postgres-auth.repository.ts'
import { createAuthRouter } from './modules/user/routes/auth.routes.ts'
import { AuthService } from './modules/user/service/auth.service.ts'
import { errorHandler, notFoundHandler } from './shared/http/error-handler.ts'

export const createApp = () => {
  const authRepository = new PostgresAuthRepository(pool)
  const passwordResetMailer = new NodemailerPasswordResetMailer(env.smtp, env.mailFrom)
  const authService = new AuthService(
    authRepository,
    {
      accessTokenSecret: env.jwtAccessSecret,
      accessTokenTtlSeconds: env.accessTokenTtlSeconds,
      refreshTokenTtlDays: env.refreshTokenTtlDays,
      appBaseUrl: env.appBaseUrl,
      passwordResetTtlMinutes: env.passwordResetTtlMinutes,
    },
    passwordResetMailer,
  )
  const authController = new AuthController(authService)

  const today = () => todayIn(env.reportTimeZone)
  const reportRepository = new PostgresAttendanceReportRepository(pool, env.reportTimeZone)
  const reportService = new AttendanceReportService(reportRepository, env.reportLateAfter, today)
  const reportController = new AttendanceReportController(reportService, today)

  const app = express()

  app.disable('x-powered-by')
  app.use(cors({ origin: env.allowedOrigins, credentials: true }))
  app.use(cookieParser())
  app.use(express.json())

  app.use('/api/auth', createAuthRouter(authController, authService))
  app.use('/api/reports', createReportRouter(reportController, authService))

  app.get('/api/health', (_request, response) => {
    response.json({ data: { status: 'ok' } })
  })

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
