import { Router, type RequestHandler } from 'express'
import { requireAuth } from '../../user/middleware/require-auth.ts'
import type { AuthService } from '../../user/service/auth.service.ts'
import type { AttendanceController } from '../controller/attendance.ts'

export const createAttendanceRouter = (
  controller: AttendanceController,
  authService: AuthService,
  canCreateOwnQrCode: RequestHandler,
): Router => {
  const router = Router()

  router.post('/qr-codes', requireAuth(authService), canCreateOwnQrCode, (request, response) =>
    controller.createQrCode(request, response),
  )
  router.post('/scan', (request, response) => controller.scan(request, response))

  return router
}
