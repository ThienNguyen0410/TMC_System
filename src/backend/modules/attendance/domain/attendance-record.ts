import type { AttendanceEventType } from './attendance-event.ts'
import type { AttendanceLocation } from './attendance-location.ts'

export interface AttendanceRecord {
  id: string
  employeeId: string
  gateId: string | null
  eventType: AttendanceEventType
  recordedAt: Date
  source: string
  location: AttendanceLocation | null
}
