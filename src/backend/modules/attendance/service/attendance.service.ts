import { AttendanceCooldownError, EmployeeNotFoundError } from '../attendance.errors.ts'
import { determineNextEventType } from '../domain/attendance-event.ts'
import type { AttendanceLocation } from '../domain/attendance-location.ts'
import { ATTENDANCE_COOLDOWN_SECONDS } from '../domain/attendance-policy.ts'
import type { AttendanceRecord } from '../domain/attendance-record.ts'
import type { AttendanceEmployee } from '../domain/attendance-employee.ts'
import type { AttendanceRecordRepository } from '../repository/attendance-record.repository.ts'
import type { EmployeeRepository } from '../repository/employee.repository.ts'
import type { QrCodeService } from './qr-code.service.ts'

export interface ScanAttendanceInput {
  token: string
  gateId: string | null
  location: AttendanceLocation | null
}

export interface ScanAttendanceResult {
  record: AttendanceRecord
  employee: AttendanceEmployee
  cooldownSeconds: number
}

export class AttendanceService {
  private readonly qrCodeService: QrCodeService
  private readonly attendanceRecordRepository: AttendanceRecordRepository
  private readonly employeeRepository: EmployeeRepository
  private readonly clock: () => Date

  constructor(
    qrCodeService: QrCodeService,
    attendanceRecordRepository: AttendanceRecordRepository,
    employeeRepository: EmployeeRepository,
    clock: () => Date = () => new Date(),
  ) {
    this.qrCodeService = qrCodeService
    this.attendanceRecordRepository = attendanceRecordRepository
    this.employeeRepository = employeeRepository
    this.clock = clock
  }

  async registerScan(input: ScanAttendanceInput): Promise<ScanAttendanceResult> {
    const qrCode = await this.qrCodeService.findValidByToken(input.token)
    const now = this.clock()
    const latestRecord = await this.attendanceRecordRepository.findLatestByEmployeeId(
      qrCode.employeeId,
    )

    if (latestRecord) {
      const elapsedMs = now.getTime() - latestRecord.recordedAt.getTime()
      const remainingMs = ATTENDANCE_COOLDOWN_SECONDS * 1000 - elapsedMs

      if (remainingMs > 0) {
        throw new AttendanceCooldownError(Math.ceil(remainingMs / 1000))
      }
    }

    const employee = await this.employeeRepository.findById(qrCode.employeeId)

    if (!employee) {
      throw new EmployeeNotFoundError(qrCode.employeeId)
    }

    const record = await this.attendanceRecordRepository.create({
      employeeId: qrCode.employeeId,
      gateId: input.gateId,
      eventType: determineNextEventType(latestRecord?.eventType ?? null),
      recordedAt: now,
      source: 'QR',
      location: input.location,
    })

    await this.qrCodeService.revoke(qrCode.id)

    return {
      record,
      employee,
      cooldownSeconds: ATTENDANCE_COOLDOWN_SECONDS,
    }
  }
}
