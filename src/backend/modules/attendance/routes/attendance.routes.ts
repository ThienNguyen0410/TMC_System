import { Router } from 'express'
import { requireAuth } from '../../user/middleware/require-auth.ts'
import type { AuthService } from '../../user/service/auth.service.ts'
import type { AttendanceController } from '../controller/attendance.ts'

export const createAttendanceRouter = (
  controller: AttendanceController,
  authService: AuthService,
): Router => {
  const router = Router()

  router.post('/qr-codes', requireAuth(authService), (request, response) =>
    controller.createQrCode(request, response),
  )
  router.post('/scan', (request, response) => controller.scan(request, response))

  return router
}
