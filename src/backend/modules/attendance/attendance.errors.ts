import { AppError } from '../../shared/errors/app-error.ts'

export class EmployeeNotFoundError extends AppError {
  constructor(employeeId: string) {
    super(`Employee ${employeeId} was not found.`, 404, 'EMPLOYEE_NOT_FOUND')
  }
}

export class InvalidQrCodeError extends AppError {
  constructor(message = 'The QR code is invalid, expired, or has already been used.') {
    super(message, 400, 'INVALID_QR_CODE')
  }
}

export class AttendanceCooldownError extends AppError {
  constructor(retryAfterSeconds: number) {
    super(
      `Please wait ${retryAfterSeconds} second(s) before scanning again.`,
      429,
      'ATTENDANCE_COOLDOWN',
    )
  }
}
