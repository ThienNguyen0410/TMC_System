import { AppError } from '../../../shared/errors/app-error.ts'

export class InvalidQrCodeError extends AppError {
  constructor(message = 'This QR code is invalid or has been revoked.') {
    super(message, 400, 'INVALID_QR_CODE')
  }
}

export class QrCodeExpiredError extends AppError {
  constructor() {
    super('This QR code has expired. Generate a new one and try again.', 410, 'QR_CODE_EXPIRED')
  }
}

export class QrCodeAlreadyUsedError extends AppError {
  constructor() {
    super('This QR code has already been used.', 409, 'QR_CODE_ALREADY_USED')
  }
}

export class QrLocationMismatchError extends AppError {
  constructor() {
    super('The QR code was generated more than 1 meter away from this kiosk.', 400, 'QR_LOCATION_MISMATCH')
  }
}

export class AttendanceCooldownError extends AppError {
  constructor(retryAfterSeconds: number) {
    super(
      `Attendance was just recorded for this employee. Try again in ${retryAfterSeconds} seconds.`,
      429,
      'ATTENDANCE_COOLDOWN',
    )
  }
}
