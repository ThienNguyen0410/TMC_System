export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE'

export interface RecordAttendanceInput {
  employeeId: string
  employeeName: string
  departmentId?: string
  workDate: string
  checkInAt?: string
  checkOutAt?: string
  status?: AttendanceStatus
  note?: string
}

export interface AttendanceRecordDto {
  id: string
  employeeId: string
  employeeName: string
  departmentId: string | null
  workDate: string
  checkInAt: string | null
  checkOutAt: string | null
  status: AttendanceStatus
  note: string | null
  createdAt: string
  syncedToPayrollAt: string | null
}

export interface AttendanceQuery {
  employeeId?: string
  from?: string
  to?: string
}
