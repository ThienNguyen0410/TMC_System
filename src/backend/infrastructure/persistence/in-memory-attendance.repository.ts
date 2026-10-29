import type { AttendanceDomain } from '../../modules/attendance/attendance.domain.ts'
import type { AttendanceRepository } from '../../modules/attendance/attendance.repository.ts'
import type { AttendanceQuery } from '../../modules/attendance/attendance.types.ts'
import type { InMemoryDatabase } from './in-memory-database.ts'

export class InMemoryAttendanceRepository implements AttendanceRepository {
  private readonly database: InMemoryDatabase

  constructor(database: InMemoryDatabase) {
    this.database = database
  }

  async save(record: AttendanceDomain): Promise<void> {
    this.database.attendanceRecords.set(record.id, record)
  }

  async findByEmployeeAndDate(
    employeeId: string,
    workDate: string,
  ): Promise<AttendanceDomain | null> {
    for (const record of this.database.attendanceRecords.values()) {
      if (record.employeeId === employeeId && record.workDate === workDate) {
        return record
      }
    }
    return null
  }

  async find(query: AttendanceQuery): Promise<AttendanceDomain[]> {
    return [...this.database.attendanceRecords.values()]
      .filter((record) => !query.employeeId || record.employeeId === query.employeeId)
      .filter((record) => !query.from || record.workDate >= query.from)
      .filter((record) => !query.to || record.workDate <= query.to)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
  }

  async markSynced(id: string, syncedAt: Date): Promise<void> {
    const record = this.database.attendanceRecords.get(id)
    if (record) {
      this.database.attendanceRecords.set(id, record.markSynced(syncedAt))
    }
  }
}
