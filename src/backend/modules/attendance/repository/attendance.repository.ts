import type {
  AttendanceEmployee,
  AttendanceRecord,
  LatestAttendanceRecord,
  NewAttendanceRecord,
} from '../domain/attendance.ts'

export interface AttendanceRepository {
  findEmployeeById(id: string): Promise<AttendanceEmployee | null>
  findLatestRecord(employeeId: string): Promise<LatestAttendanceRecord | null>
  createRecord(record: NewAttendanceRecord): Promise<AttendanceRecord>
}
