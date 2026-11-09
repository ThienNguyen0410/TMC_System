import type {
  AttendanceEmployee,
  AttendanceRecord,
  LatestAttendanceRecord,
  NewAttendanceRecord,
} from '../domain/attendance.ts'
import { QrCodeAlreadyUsedError } from '../domain/attendance-errors.ts'
import type { NewQrCode, QrCodeRecord } from '../domain/qr-code.ts'
import type { AttendanceRepository } from '../repository/attendance.repository.ts'
import type { QrCodeRepository } from '../repository/qr-code.repository.ts'

export interface RecordedOutboxEvent {
  eventId: string
  aggregateId: string
  payload: Record<string, unknown>
}

export class InMemoryAttendanceRepository
  implements AttendanceRepository, QrCodeRepository
{
  readonly employees = new Map<string, AttendanceEmployee>()
  readonly qrCodes: QrCodeRecord[] = []
  readonly records: AttendanceRecord[] = []
  readonly outbox: RecordedOutboxEvent[] = []

  private nextQrId = 1
  private nextRecordId = 1

  addEmployee(employee: AttendanceEmployee): void {
    this.employees.set(employee.id, employee)
  }

  async createQrCode(qrCode: NewQrCode): Promise<QrCodeRecord> {
    const record: QrCodeRecord = {
      ...qrCode,
      id: String(this.nextQrId++),
      revokedAt: null,
    }

    this.qrCodes.push(record)
    return record
  }

  async findQrCodeByTokenHash(tokenHash: string): Promise<QrCodeRecord | null> {
    return this.qrCodes.find((qrCode) => qrCode.tokenHash === tokenHash) ?? null
  }

  async findEmployeeById(id: string): Promise<AttendanceEmployee | null> {
    return this.employees.get(id) ?? null
  }

  async findLatestRecord(employeeId: string): Promise<LatestAttendanceRecord | null> {
    const latest = this.records
      .filter((record) => record.employeeId === employeeId)
      .sort(
        (left, right) =>
          right.recordedAt.getTime() - left.recordedAt.getTime() ||
          Number(right.id) - Number(left.id),
      )[0]

    return latest ? { eventType: latest.eventType, recordedAt: latest.recordedAt } : null
  }

  async createRecord(record: NewAttendanceRecord): Promise<AttendanceRecord> {
    const qrCode = this.qrCodes.find((candidate) => candidate.id === record.qrCodeId)

    if (!qrCode || qrCode.revokedAt) {
      throw new QrCodeAlreadyUsedError()
    }

    qrCode.revokedAt = record.recordedAt

    const created: AttendanceRecord = {
      id: String(this.nextRecordId++),
      employeeId: record.employeeId,
      eventType: record.eventType,
      recordedAt: record.recordedAt,
      source: record.source,
    }

    this.records.push(created)
    this.outbox.push({
      eventId: record.eventId,
      aggregateId: created.id,
      payload: {
        recordId: created.id,
        employeeId: record.employeeId,
        eventType: record.eventType,
        recordedAt: record.recordedAt.toISOString(),
        source: record.source,
        qrCodeId: record.qrCodeId,
        qrLocation: record.qrLocation,
        kioskLocation: record.kioskLocation,
      },
    })

    return created
  }
}
