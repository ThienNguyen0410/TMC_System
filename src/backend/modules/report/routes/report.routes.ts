import { Router, type RequestHandler } from 'express'
import { requireAuth } from '../../user/middleware/require-auth.ts'
import type { AuthService } from '../../user/service/auth.service.ts'
import type { AttendanceReportController } from '../controller/attendance-report.ts'

export const createReportRouter = (
  controller: AttendanceReportController,
  authService: AuthService,
  canViewReports: RequestHandler,
  canExportReports: RequestHandler,
): Router => {
  const router = Router()

  // Employees may read their own daily attendance; reports across employees need the guards from app.ts.
  router.get('/attendance/me', requireAuth(authService), (request, response) =>
    controller.listMine(request, response),
  )
  router.get('/attendance', requireAuth(authService), canViewReports, (request, response) =>
    controller.list(request, response),
  )
  router.get(
    '/attendance/export',
    requireAuth(authService),
    canExportReports,
    (request, response) => controller.exportCsv(request, response),
  )

  return router
}
