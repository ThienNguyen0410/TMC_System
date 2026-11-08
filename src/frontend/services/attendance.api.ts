import type {
  AttendanceScanInput,
  AttendanceScanRecord,
  IssuedQrCode,
} from '../types/attendance'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

interface ApiErrorPayload {
  error?: {
    code?: string
    message?: string
  }
}

export class AttendanceApiError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(message: string, status: number, code: string | null) {
    super(message)
    this.name = 'AttendanceApiError'
    this.status = status
    this.code = code
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readError(payload: unknown): { code: string | null; message: string | null } {
  if (!isRecord(payload)) {
    return { code: null, message: null }
  }

  const error = (payload as ApiErrorPayload).error

  return {
    code: typeof error?.code === 'string' ? error.code : null,
    message: typeof error?.message === 'string' ? error.message : null,
  }
}

async function postJson(path: string, body: unknown): Promise<unknown> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AttendanceApiError('Unable to connect to the attendance server.', 0, null)
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const error = readError(payload)
    throw new AttendanceApiError(
      error.message ?? 'The attendance request failed.',
      response.status,
      error.code,
    )
  }

  return payload
}

function readIssuedQrCode(payload: unknown): IssuedQrCode | null {
  if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.qrCode)) {
    return null
  }

  const qrCode = payload.data.qrCode

  if (
    typeof qrCode.token !== 'string' ||
    typeof qrCode.expiresAt !== 'string' ||
    typeof qrCode.expiresInSeconds !== 'number'
  ) {
    return null
  }

  return {
    token: qrCode.token,
    expiresAt: qrCode.expiresAt,
    expiresInSeconds: qrCode.expiresInSeconds,
  }
}

function readScanRecord(payload: unknown): AttendanceScanRecord | null {
  if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.attendance)) {
    return null
  }

  const attendance = payload.data.attendance

  if (
    typeof attendance.id !== 'string' ||
    typeof attendance.employeeId !== 'string' ||
    typeof attendance.employeeCode !== 'string' ||
    typeof attendance.employeeName !== 'string' ||
    (attendance.department !== null && typeof attendance.department !== 'string') ||
    (attendance.gateId !== null && typeof attendance.gateId !== 'string') ||
    (attendance.eventType !== 'CHECK_IN' && attendance.eventType !== 'CHECK_OUT') ||
    typeof attendance.recordedAt !== 'string' ||
    typeof attendance.source !== 'string' ||
    typeof attendance.cooldownSeconds !== 'number'
  ) {
    return null
  }

  return {
    id: attendance.id,
    employeeId: attendance.employeeId,
    employeeCode: attendance.employeeCode,
    employeeName: attendance.employeeName,
    department: attendance.department,
    gateId: attendance.gateId,
    eventType: attendance.eventType,
    recordedAt: attendance.recordedAt,
    source: attendance.source,
    cooldownSeconds: attendance.cooldownSeconds,
  }
}

export async function requestAttendanceQrCode(employeeId: string): Promise<IssuedQrCode> {
  const payload = await postJson('/api/attendance/qr-codes', { employeeId })
  const qrCode = readIssuedQrCode(payload)

  if (!qrCode) {
    throw new AttendanceApiError('The attendance server returned an invalid response.', 0, null)
  }

  return qrCode
}

export async function submitAttendanceScan(
  input: AttendanceScanInput,
): Promise<AttendanceScanRecord> {
  const payload = await postJson('/api/attendance/scan', input)
  const attendance = readScanRecord(payload)

  if (!attendance) {
    throw new AttendanceApiError('The attendance server returned an invalid response.', 0, null)
  }

  return attendance
}
