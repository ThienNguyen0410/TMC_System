export type AttendanceStatus = 'present' | 'late' | 'absent' | 'incomplete'

export type AttendanceEventType = 'CHECK_IN' | 'CHECK_OUT'

export interface IssuedQrCode {
  token: string
  expiresAt: string
  expiresInSeconds: number
}

export interface AttendanceLocationPayload {
  latitude: number
  longitude: number
  accuracy: number
}

export interface AttendanceScanInput {
  token: string
  gateId?: number | null
  location?: AttendanceLocationPayload | null
}

export interface AttendanceScanRecord {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  department: string | null
  gateId: string | null
  eventType: AttendanceEventType
  recordedAt: string
  source: string
  cooldownSeconds: number
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  username: string
  department: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: AttendanceStatus
  workingHours: number | null
}

export interface AttendanceStats {
  totalEmployees: number
  present: number
  late: number
  absent: number
  incomplete: number
  attendanceRate: number
}

export interface DailyTrendPoint {
  date: string
  label: string
  present: number
  late: number
  absent: number
  incomplete: number
  total: number
}

export interface EmployeeAttendanceSummary {
  present: number
  late: number
  absent: number
  incomplete: number
  totalHours: number
  totalRecords: number
}
