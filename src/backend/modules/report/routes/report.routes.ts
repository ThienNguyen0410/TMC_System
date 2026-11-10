import { Router } from 'express'
import { requireAuth } from '../../user/middleware/require-auth.ts'
import { requireRole } from '../../user/middleware/require-role.ts'
import type { AuthService } from '../../user/service/auth.service.ts'
import type { AttendanceReportController } from '../controller/attendance-report.ts'

export const createReportRouter = (
  controller: AttendanceReportController,
  authService: AuthService,
): Router => {
  const router = Router()

  // Employees may read their own daily attendance; reports across employees stay admin-only.
  router.get('/attendance/me', requireAuth(authService), (request, response) =>
    controller.listMine(request, response),
  )
  router.get('/attendance', requireAuth(authService), requireRole('admin'), (request, response) =>
    controller.list(request, response),
  )
  router.get(
    '/attendance/export',
    requireAuth(authService),
    requireRole('admin'),
    (request, response) => controller.exportCsv(request, response),
  )

  return router
}
