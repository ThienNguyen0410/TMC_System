export const ATTENDANCE_EVENT_TYPES = ['CHECK_IN', 'CHECK_OUT'] as const

export type AttendanceEventType = (typeof ATTENDANCE_EVENT_TYPES)[number]

export const ATTENDANCE_SOURCE_QR = 'QR'

export interface GeoLocation {
  latitude: number
  longitude: number
  accuracy: number
}

export interface AttendanceEmployee {
  id: string
  username: string
  fullName: string
  department: string | null
  isActive: boolean
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  eventType: AttendanceEventType
  recordedAt: Date
  source: string
}

export interface LatestAttendanceRecord {
  eventType: AttendanceEventType
  recordedAt: Date
}

export interface NewAttendanceRecord {
  eventId: string
  employeeId: string
  eventType: AttendanceEventType
  recordedAt: Date
  source: string
  qrCodeId: string
  qrLocation: GeoLocation | null
  kioskLocation: GeoLocation | null
}

export function nextAttendanceEvent(
  previous: AttendanceEventType | null,
): AttendanceEventType {
  return previous === 'CHECK_IN' ? 'CHECK_OUT' : 'CHECK_IN'
}
