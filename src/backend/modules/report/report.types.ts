import type { AttendanceStatus } from '../attendance/attendance.types.ts'

export interface AttendanceReportQuery {
  from: string
  to: string
  departmentId?: string
}

export interface AttendanceSourceRow {
  employeeId: string
  departmentId: string | null
  workDate: string
  status: AttendanceStatus
}

export interface StatusCount {
  status: AttendanceStatus
  count: number
}

export interface DepartmentSummary {
  departmentId: string | null
  total: number
  present: number
  late: number
  absent: number
  leave: number
  attendanceRate: number
}

export interface DailySummary {
  date: string
  total: number
  present: number
  late: number
  absent: number
  leave: number
}

export interface AttendanceReportDto {
  period: {
    from: string
    to: string
  }
  generatedAt: string
  totalRecords: number
  statusCounts: StatusCount[]
  attendanceRate: number
  byDepartment: DepartmentSummary[]
  byDate: DailySummary[]
}
