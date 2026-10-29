import type { AttendanceDomain } from './attendance.domain.ts'
import type { AttendanceQuery } from './attendance.types.ts'

export interface AttendanceRepository {
  save(record: AttendanceDomain): Promise<void>
  findByEmployeeAndDate(employeeId: string, workDate: string): Promise<AttendanceDomain | null>
  find(query: AttendanceQuery): Promise<AttendanceDomain[]>
  markSynced(id: string, syncedAt: Date): Promise<void>
}
