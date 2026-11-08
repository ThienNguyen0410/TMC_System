import { ValidationError } from '../../../shared/errors/app-error.ts'
import type { HttpRequest, HttpResponse } from '../../../shared/http/http.types.ts'
import { asObject, readRequiredString } from '../../../shared/http/parsers.ts'
import type { AttendanceLocation } from '../domain/attendance-location.ts'
import type { AttendanceService } from '../service/attendance.service.ts'
import type { QrCodeService } from '../service/qr-code.service.ts'

const readPositiveInteger = (value: unknown, field: string): string => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return String(value)
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim()) && Number(value) > 0) {
    return value.trim()
  }

  throw new ValidationError(`${field} must be a positive integer`)
}

const readOptionalIdentifier = (
  source: Record<string, unknown>,
  field: string,
): string | null => {
  const value = source[field]

  if (value === undefined || value === null) {
    return null
  }

  return readPositiveInteger(value, field)
}

const readCoordinate = (
  source: Record<string, unknown>,
  field: string,
  minimum: number,
  maximum: number,
): number => {
  const value = source[field]

  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new ValidationError(`${field} must be a number between ${minimum} and ${maximum}`)
  }

  return value
}

const readOptionalLocation = (value: unknown): AttendanceLocation | null => {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('location must be an object')
  }

  const source = value as Record<string, unknown>

  return {
    latitude: readCoordinate(source, 'latitude', -90, 90),
    longitude: readCoordinate(source, 'longitude', -180, 180),
    accuracy: readCoordinate(source, 'accuracy', 0, Number.MAX_SAFE_INTEGER),
  }
}

export class AttendanceController {
  private readonly qrCodeService: QrCodeService
  private readonly attendanceService: AttendanceService

  constructor(qrCodeService: QrCodeService, attendanceService: AttendanceService) {
    this.qrCodeService = qrCodeService
    this.attendanceService = attendanceService
  }

  async createQrCode(request: HttpRequest): Promise<HttpResponse> {
    const body = asObject(request.body)
    const employeeId = readPositiveInteger(body.employeeId, 'employeeId')
    const qrCode = await this.qrCodeService.issueForEmployee(employeeId)

    return {
      status: 201,
      body: {
        data: {
          qrCode: {
            token: qrCode.token,
            expiresAt: qrCode.expiresAt.toISOString(),
            expiresInSeconds: qrCode.expiresInSeconds,
          },
        },
      },
    }
  }

  async scan(request: HttpRequest): Promise<HttpResponse> {
    const body = asObject(request.body)
    const token = readRequiredString(body, 'token')
    const gateId = readOptionalIdentifier(body, 'gateId')
    const location = readOptionalLocation(body.location)
    const result = await this.attendanceService.registerScan({ token, gateId, location })

    return {
      status: 201,
      body: {
        data: {
          attendance: {
            id: result.record.id,
            employeeId: result.record.employeeId,
            employeeCode: result.employee.employeeCode,
            employeeName: result.employee.fullName,
            department: result.employee.department,
            gateId: result.record.gateId,
            eventType: result.record.eventType,
            recordedAt: result.record.recordedAt.toISOString(),
            source: result.record.source,
            location: result.record.location,
            cooldownSeconds: result.cooldownSeconds,
          },
        },
      },
    }
  }
}
