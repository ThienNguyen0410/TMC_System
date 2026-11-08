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

  // Reports cover every employee, so only admins may read them.
  router.use(requireAuth(authService), requireRole('admin'))

  router.get('/attendance', (request, response) => controller.list(request, response))
  router.get('/attendance/export', (request, response) => controller.exportCsv(request, response))

  return router
}
