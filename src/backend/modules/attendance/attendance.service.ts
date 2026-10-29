import { ConflictError } from '../../shared/errors/app-error.ts'
import { AttendanceDomain } from './attendance.domain.ts'
import type { HRPayrollPort } from './attendance.ports.ts'
import type { AttendanceRepository } from './attendance.repository.ts'
import type { AttendanceQuery, AttendanceRecordDto, RecordAttendanceInput } from './attendance.types.ts'

export class AttendanceService {
  private readonly repository: AttendanceRepository
  private readonly hrPayroll: HRPayrollPort

  constructor(repository: AttendanceRepository, hrPayroll: HRPayrollPort) {
    this.repository = repository
    this.hrPayroll = hrPayroll
  }

  async recordAttendance(input: RecordAttendanceInput): Promise<AttendanceRecordDto> {
    const record = AttendanceDomain.record(input)
    const existing = await this.repository.findByEmployeeAndDate(record.employeeId, record.workDate)

    if (existing) {
      throw new ConflictError('Attendance has already been recorded for this employee and work date')
    }

    await this.repository.save(record)

    try {
      await this.hrPayroll.sendAttendance(record.toDto())
      const syncedAt = new Date()
      await this.repository.markSynced(record.id, syncedAt)
      return record.markSynced(syncedAt).toDto()
    } catch (error) {
      console.error('Failed to synchronize attendance with the HR/Payroll system', error)
      return record.toDto()
    }
  }

  async listRecords(query: AttendanceQuery): Promise<AttendanceRecordDto[]> {
    const records = await this.repository.find(query)
    return records.map((record) => record.toDto())
  }
}
