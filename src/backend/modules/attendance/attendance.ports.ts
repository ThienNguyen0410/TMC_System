import type { AttendanceRecordDto } from './attendance.types.ts'

export interface HRPayrollPort {
  sendAttendance(record: AttendanceRecordDto): Promise<void>
}
