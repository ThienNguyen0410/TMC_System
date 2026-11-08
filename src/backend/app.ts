import type { Server } from 'node:http'
import { pool } from '../database/config.ts'
import { AttendanceController } from './modules/attendance/controller/attendance.ts'
import { PostgresAttendanceRecordRepository } from './modules/attendance/repository/postgres-attendance-record.repository.ts'
import { PostgresEmployeeRepository } from './modules/attendance/repository/postgres-employee.repository.ts'
import { PostgresQrCodeRepository } from './modules/attendance/repository/postgres-qr-code.repository.ts'
import { createAttendanceRoutes } from './modules/attendance/routes/attendance.routes.ts'
import { AttendanceService } from './modules/attendance/service/attendance.service.ts'
import { CryptoTokenGenerator, CryptoTokenHasher } from './modules/attendance/service/crypto-token.ts'
import { QrCodeService } from './modules/attendance/service/qr-code.service.ts'
import { AuthController } from './modules/user/controller/auth.ts'
import { PostgresAuthRepository } from './modules/user/repository/postgres-auth.repository.ts'
import { createAuthRoutes } from './modules/user/routes/auth.routes.ts'
import { AuthService } from './modules/user/service/auth.service.ts'
import { createHttpServer } from './shared/http/http-server.ts'
import type { Route } from './shared/http/http.types.ts'

export const createApp = (): Server => {
  const authRepository = new PostgresAuthRepository(pool)
  const authService = new AuthService(authRepository)
  const authController = new AuthController(authService)

  const qrCodeRepository = new PostgresQrCodeRepository(pool)
  const employeeRepository = new PostgresEmployeeRepository(pool)
  const attendanceRecordRepository = new PostgresAttendanceRecordRepository(pool)
  const tokenGenerator = new CryptoTokenGenerator()
  const tokenHasher = new CryptoTokenHasher()
  const qrCodeService = new QrCodeService(
    qrCodeRepository,
    employeeRepository,
    tokenGenerator,
    tokenHasher,
  )
  const attendanceService = new AttendanceService(
    qrCodeService,
    attendanceRecordRepository,
    employeeRepository,
  )
  const attendanceController = new AttendanceController(qrCodeService, attendanceService)

  const routes: Route[] = [
    ...createAuthRoutes(authController),
    ...createAttendanceRoutes(attendanceController),
    {
      method: 'GET',
      path: '/api/health',
      handler: async () => ({ status: 200, body: { data: { status: 'ok' } } }),
    },
  ]

  return createHttpServer(routes)
}
