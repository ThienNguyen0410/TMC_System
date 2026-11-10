export interface AttendanceRecordDto {
  id: string
  employeeId: string
  workDate: string
  checkInAt: string | null
  checkOutAt: string | null
  status: string
  note: string | null
}
