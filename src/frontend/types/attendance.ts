export type AttendanceStatus = 'present' | 'late' | 'absent' | 'incomplete'

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
