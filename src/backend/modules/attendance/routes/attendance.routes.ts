import type { Route } from '../../../shared/http/http.types.ts'
import type { AttendanceController } from '../controller/attendance.ts'

export const createAttendanceRoutes = (controller: AttendanceController): Route[] => [
  {
    method: 'POST',
    path: '/api/attendance/qr-codes',
    handler: (request) => controller.createQrCode(request),
  },
  {
    method: 'POST',
    path: '/api/attendance/scan',
    handler: (request) => controller.scan(request),
  },
]
