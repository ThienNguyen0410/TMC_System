import type { AttendanceEventType } from '../domain/attendance-event.ts'
import type { AttendanceLocation } from '../domain/attendance-location.ts'
import type { AttendanceRecord } from '../domain/attendance-record.ts'

export interface CreateAttendanceRecordInput {
  employeeId: string
  gateId: string | null
  eventType: AttendanceEventType
  recordedAt: Date
  source: string
  location: AttendanceLocation | null
}

export interface AttendanceRecordRepository {
  findLatestByEmployeeId(employeeId: string): Promise<AttendanceRecord | null>
  create(input: CreateAttendanceRecordInput): Promise<AttendanceRecord>
}
