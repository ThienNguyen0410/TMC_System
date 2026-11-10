import type {
  AttendanceConfirmation,
  AttendanceEmployee,
  AttendanceEventType,
  AttendanceQrCode,
  GeoLocation,
} from '../types/attendance'
import {
  API_BASE_URL,
  authorizedFetch,
  isRecord,
  readErrorMessage,
} from './auth.api'

export class AttendanceApiError extends Error {
  readonly code: string

  constructor(message: string, code = 'ATTENDANCE_REQUEST_FAILED') {
    super(message)
    this.name = 'AttendanceApiError'
    this.code = code
  }
}

function readErrorCode(payload: unknown): string {
  if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.code === 'string') {
    return payload.error.code
  }

  return 'ATTENDANCE_REQUEST_FAILED'
}

function readLocation(value: unknown): GeoLocation | null {
  if (
    !isRecord(value) ||
    typeof value.latitude !== 'number' ||
    typeof value.longitude !== 'number' ||
    typeof value.accuracy !== 'number'
  ) {
    return null
  }

  return {
    latitude: value.latitude,
    longitude: value.longitude,
    accuracy: value.accuracy,
  }
}

function readQrCode(payload: unknown): AttendanceQrCode | null {
  if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.qrCode)) {
    return null
  }

  const qrCode = payload.data.qrCode

  if (
    typeof qrCode.token !== 'string' ||
    typeof qrCode.issuedAt !== 'string' ||
    typeof qrCode.expiresAt !== 'string' ||
    typeof qrCode.expiresInSeconds !== 'number'
  ) {
    return null
  }

  return {
    token: qrCode.token,
    issuedAt: qrCode.issuedAt,
    expiresAt: qrCode.expiresAt,
    expiresInSeconds: qrCode.expiresInSeconds,
    location: readLocation(qrCode.location),
  }
}

function readEmployee(value: unknown): AttendanceEmployee | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.username !== 'string' ||
    typeof value.fullName !== 'string'
  ) {
    return null
  }

  return {
    id: value.id,
    username: value.username,
    fullName: value.fullName,
    department: typeof value.department === 'string' ? value.department : null,
  }
}

function readEventType(value: unknown): AttendanceEventType | null {
  return value === 'CHECK_IN' || value === 'CHECK_OUT' ? value : null
}

function readConfirmation(payload: unknown): AttendanceConfirmation | null {
  if (
    !isRecord(payload) ||
    !isRecord(payload.data) ||
    !isRecord(payload.data.attendance)
  ) {
    return null
  }

  const attendance = payload.data.attendance
  const employee = readEmployee(attendance.employee)
  const eventType = readEventType(attendance.eventType)

  if (
    !employee ||
    !eventType ||
    typeof attendance.recordId !== 'string' ||
    typeof attendance.recordedAt !== 'string' ||
    typeof attendance.source !== 'string'
  ) {
    return null
  }

  return {
    recordId: attendance.recordId,
    employee,
    eventType,
    recordedAt: attendance.recordedAt,
    source: attendance.source,
  }
}

async function readFailure(response: Response): Promise<AttendanceApiError> {
  const payload: unknown = await response.json().catch(() => null)

  return new AttendanceApiError(
    readErrorMessage(payload) ?? 'The attendance request failed. Please try again.',
    readErrorCode(payload),
  )
}

export async function createAttendanceQrCode(
  location: GeoLocation | null,
): Promise<AttendanceQrCode> {
  let response: Response

  try {
    response = await authorizedFetch('/api/attendance/qr-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location }),
    })
  } catch {
    throw new AttendanceApiError('Unable to connect to the attendance server.')
  }

  if (!response.ok) {
    throw await readFailure(response)
  }

  const qrCode = readQrCode(await response.json().catch(() => null))

  if (!qrCode) {
    throw new AttendanceApiError('The attendance server returned an invalid QR code.')
  }

  return qrCode
}

export async function scanAttendanceQrCode(
  token: string,
  location: GeoLocation | null,
): Promise<AttendanceConfirmation> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/api/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, location }),
    })
  } catch {
    throw new AttendanceApiError('Unable to connect to the attendance server.')
  }

  if (!response.ok) {
    throw await readFailure(response)
  }

  const confirmation = readConfirmation(await response.json().catch(() => null))

  if (!confirmation) {
    throw new AttendanceApiError('The attendance server returned an invalid response.')
  }

  return confirmation
}
