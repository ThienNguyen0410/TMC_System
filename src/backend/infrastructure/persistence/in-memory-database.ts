import type { AttendanceDomain } from '../../modules/attendance/attendance.domain.ts'

export class InMemoryDatabase {
  readonly attendanceRecords = new Map<string, AttendanceDomain>()
}
