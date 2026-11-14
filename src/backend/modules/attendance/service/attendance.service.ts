import { randomUUID } from 'node:crypto'
import {
  ATTENDANCE_SOURCE_QR,
  nextAttendanceEvent,
  type AttendanceEmployee,
  type AttendanceEventType,
  type GeoLocation,
} from '../domain/attendance.ts'
import {
  AttendanceCooldownError,
  InvalidQrCodeError,
  QrLocationMismatchError,
} from '../domain/attendance-errors.ts'
import { locationWithinTolerance } from '../domain/qr-code.ts'
import type { AttendanceRepository } from '../repository/attendance.repository.ts'
import type { QrCodeValidator } from './qr-code-validator.ts'

export interface AttendanceServiceConfig {
  cooldownSeconds: number
}

export interface ScanAttendanceInput {
  token: string
  location: GeoLocation | null
}

export interface AttendanceConfirmation {
  recordId: string
  employee: AttendanceEmployee
  eventType: AttendanceEventType
  recordedAt: Date
  source: string
}

export class AttendanceService {
  private readonly repository: AttendanceRepository
  private readonly qrCodeValidator: QrCodeValidator
  private readonly config: AttendanceServiceConfig
  private readonly now: () => Date

  constructor(
    repository: AttendanceRepository,
    qrCodeValidator: QrCodeValidator,
    config: AttendanceServiceConfig,
    now: () => Date = () => new Date(),
  ) {
    this.repository = repository
    this.qrCodeValidator = qrCodeValidator
    this.config = config
    this.now = now
  }

  async scan(input: ScanAttendanceInput): Promise<AttendanceConfirmation> {
    const qrCode = await this.qrCodeValidator.validate(input.token)

    if (
      qrCode.location &&
      input.location &&
      !locationWithinTolerance(qrCode.location, input.location)
    ) {
      throw new QrLocationMismatchError()
    }

    console.log("QR code", qrCode.location)
    console.log("Input" ,input.location)


    const employee = await this.repository.findEmployeeById(qrCode.employeeId)

    if (!employee || !employee.isActive) {
      throw new InvalidQrCodeError('The employee account linked to this QR code is not active.')
    }

    const latest = await this.repository.findLatestRecord(employee.id)
    const recordedAt = this.now()

    if (latest) {
      const elapsedMs = recordedAt.getTime() - latest.recordedAt.getTime()
      const cooldownMs = this.config.cooldownSeconds * 1000

      if (elapsedMs >= 0 && elapsedMs < cooldownMs) {
        throw new AttendanceCooldownError(Math.ceil((cooldownMs - elapsedMs) / 1000))
      }
    }

    const record = await this.repository.createRecord({
      eventId: randomUUID(),
      employeeId: employee.id,
      eventType: nextAttendanceEvent(latest?.eventType ?? null),
      recordedAt,
      source: ATTENDANCE_SOURCE_QR,
      qrCodeId: qrCode.id,
      qrLocation: qrCode.location,
      kioskLocation: input.location,
    })

    return {
      recordId: record.id,
      employee,
      eventType: record.eventType,
      recordedAt: record.recordedAt,
      source: record.source,
    }
  }
}
