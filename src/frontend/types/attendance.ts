export type AttendanceStatus = 'present' | 'late' | 'absent' | 'incomplete'

export type AttendanceEventType = 'CHECK_IN' | 'CHECK_OUT'

export interface GeoLocation {
  latitude: number
  longitude: number
  accuracy: number
}

export interface AttendanceQrCode {
  token: string
  issuedAt: string
  expiresAt: string
  expiresInSeconds: number
  location: GeoLocation | null
}

export interface AttendanceEmployee {
  id: string
  username: string
  fullName: string
  department: string | null
}

export interface AttendanceConfirmation {
  recordId: string
  employee: AttendanceEmployee
  eventType: AttendanceEventType
  recordedAt: string
  source: string
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

