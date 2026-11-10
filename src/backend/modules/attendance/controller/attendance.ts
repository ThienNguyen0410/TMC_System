import type { Request, Response } from 'express'
import {
  AuthenticationError,
  ValidationError,
} from '../../../shared/errors/app-error.ts'
import type { AuthUser } from '../../user/domain/auth-user.ts'
import { QR_CODE_TTL_SECONDS } from '../domain/qr-code.ts'
import type { AttendanceService } from '../service/attendance.service.ts'
import type { QrCodeService } from '../service/qr-code.service.ts'
import { createQrCodeSchema, scanAttendanceSchema } from './attendance.schema.ts'

export class AttendanceController {
  private readonly qrCodeService: QrCodeService
  private readonly attendanceService: AttendanceService

  constructor(qrCodeService: QrCodeService, attendanceService: AttendanceService) {
    this.qrCodeService = qrCodeService
    this.attendanceService = attendanceService
  }

  async createQrCode(request: Request, response: Response): Promise<void> {
    const user = response.locals.user as AuthUser | undefined

    if (!user) {
      throw new AuthenticationError('Authentication required.')
    }

    const parsed = createQrCodeSchema.safeParse(request.body ?? {})

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid QR code request.')
    }

    const qrCode = await this.qrCodeService.create(user.id, parsed.data.location ?? null)

    response.status(201).json({
      data: {
        qrCode: {
          token: qrCode.token,
          issuedAt: qrCode.issuedAt.toISOString(),
          expiresAt: qrCode.expiresAt.toISOString(),
          expiresInSeconds: QR_CODE_TTL_SECONDS,
          location: qrCode.location,
        },
      },
    })
  }

  async scan(request: Request, response: Response): Promise<void> {
    const parsed = scanAttendanceSchema.safeParse(request.body ?? {})

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid attendance scan.')
    }

    const confirmation = await this.attendanceService.scan({
      token: parsed.data.token,
      location: parsed.data.location ?? null,
    })

    response.status(201).json({
      data: {
        attendance: {
          recordId: confirmation.recordId,
          employee: {
            id: confirmation.employee.id,
            username: confirmation.employee.username,
            fullName: confirmation.employee.fullName,
            department: confirmation.employee.department,
          },
          eventType: confirmation.eventType,
          recordedAt: confirmation.recordedAt.toISOString(),
          source: confirmation.source,
        },
      },
    })
  }
}
