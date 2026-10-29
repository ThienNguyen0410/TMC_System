import type { HRPayrollPort } from '../../../modules/attendance/attendance.ports.ts'
import type { AttendanceRecordDto } from '../../../modules/attendance/attendance.types.ts'

export class LoggingHRPayrollGateway implements HRPayrollPort {
  sendAttendance(record: AttendanceRecordDto): Promise<void> {
    console.info(
      `[HR/Payroll] Prepared attendance ${record.id} for employee ${record.employeeId} on ${record.workDate}`,
    )
    return Promise.resolve()
  }
}
