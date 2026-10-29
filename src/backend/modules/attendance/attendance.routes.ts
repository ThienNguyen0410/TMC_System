import type { Route } from '../../shared/http/http.types.ts'
import type { AttendanceController } from './attendance.controller.ts'

export const createAttendanceRoutes = (controller: AttendanceController): Route[] => [
  {
    method: 'POST',
    path: '/api/attendance/records',
    handler: controller.record,
  },
  {
    method: 'GET',
    path: '/api/attendance/records',
    handler: controller.list,
  },
]
