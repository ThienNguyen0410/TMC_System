import { Router, type RequestHandler } from 'express'
import { requireAuth } from '../../user/middleware/require-auth.ts'
import type { AuthService } from '../../user/service/auth.service.ts'
import type { AttendanceReportController } from '../controller/attendance-report.ts'

/** Who may use each report endpoint; app.ts decides (role permissions). */
export interface ReportGuards {
  viewOwn: RequestHandler
  viewAll: RequestHandler
  export: RequestHandler
}

export const createReportRouter = (
  controller: AttendanceReportController,
  authService: AuthService,
  guards: ReportGuards,
): Router => {
  const router = Router()

  router.get('/attendance/me', requireAuth(authService), guards.viewOwn, (request, response) =>
    controller.listMine(request, response),
  )
  router.get('/attendance', requireAuth(authService), guards.viewAll, (request, response) =>
    controller.list(request, response),
  )
  router.get('/attendance/export', requireAuth(authService), guards.export, (request, response) =>
    controller.exportCsv(request, response),
  )

  return router
}
