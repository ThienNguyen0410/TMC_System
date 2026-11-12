import assert from 'node:assert/strict'
import { test } from 'node:test'
import express, { type RequestHandler } from 'express'
import { signAccessToken } from '../../../shared/security/tokens.ts'
import { withServer } from '../../../shared/testing/with-server.ts'
import type { AuthUser, UserRole } from '../../user/domain/auth-user.ts'
import type { AuthRepository } from '../../user/repository/auth.repository.ts'
import { AuthService } from '../../user/service/auth.service.ts'
import { createAttendanceRouter } from '../routes/attendance.routes.ts'
import { AttendanceService } from '../service/attendance.service.ts'
import { QrCodeService } from '../service/qr-code.service.ts'
import { InMemoryAttendanceRepository } from '../testing/in-memory-attendance.repository.ts'
import { AttendanceController } from './attendance.ts'

interface QrCodeBody {
  data: { qrCode: { token: string; expiresInSeconds: number } }
}
interface ScanBody {
  data: {
    attendance: {
      eventType: string
      employee: { id: string; fullName: string }
    }
  }
}
interface ErrorBody {
  error: { code: string }
}

const SECRET = 'test-secret'
const NOW = new Date('2026-11-08T08:00:00.000Z')

const account: AuthUser = {
  id: '2',
  username: 'employee01',
  role: 'employee',
  fullName: 'Nguyen Van An',
  email: null,
  phone: null,
  dateOfBirth: null,
  department: 'Engineering',
}

const authService = new AuthService(
  { findUserById: async (id: string) => (id === account.id ? account : null) } as unknown as AuthRepository,
  {
    accessTokenSecret: SECRET,
    accessTokenTtlSeconds: 60,
    refreshTokenTtlDays: 7,
    appBaseUrl: 'http://localhost:5173',
    passwordResetTtlMinutes: 30,
  },
  { sendPasswordReset: async () => undefined },
)

const tokenFor = (role: UserRole) =>
  signAccessToken({ id: account.id, username: account.username, role }, SECRET, 60)

const serve = (run: (baseUrl: string) => Promise<void>) => {
  const repository = new InMemoryAttendanceRepository()
  repository.addEmployee({
    id: account.id,
    username: account.username,
    fullName: account.fullName,
    department: account.department,
    isActive: true,
  })
  const qrCodeService = new QrCodeService(repository, () => NOW)
  const attendanceService = new AttendanceService(
    repository,
    qrCodeService,
    { cooldownSeconds: 30 },
    () => NOW,
  )
  const controller = new AttendanceController(qrCodeService, attendanceService)

  return withServer((app) => {
    app.use(express.json())
    const allowAll: RequestHandler = (_request, _response, next) => next()
    app.use('/api/attendance', createAttendanceRouter(controller, authService, allowAll))
  }, run)
}

const authHeaders = async () => ({
  Authorization: `Bearer ${await tokenFor('employee')}`,
  'Content-Type': 'application/json',
})

test('POST /api/attendance/qr-codes requires authentication', () =>
  serve(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/attendance/qr-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: null }),
    })

    assert.equal(response.status, 401)
  }))

test('POST /api/attendance/qr-codes returns a five-second token', () =>
  serve(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/attendance/qr-codes`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        location: { latitude: 10.772, longitude: 106.658, accuracy: 5 },
      }),
    })
    const body = (await response.json()) as QrCodeBody

    assert.equal(response.status, 201)
    assert.equal(body.data.qrCode.expiresInSeconds, 5)
    assert.ok(body.data.qrCode.token.length > 20)
  }))

test('POST /api/attendance/scan records attendance and rejects a replay', () =>
  serve(async (baseUrl) => {
    const created = (await (
      await fetch(`${baseUrl}/api/attendance/qr-codes`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ location: null }),
      })
    ).json()) as QrCodeBody

    const scan = await fetch(`${baseUrl}/api/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: created.data.qrCode.token, location: null }),
    })
    const body = (await scan.json()) as ScanBody

    assert.equal(scan.status, 201, JSON.stringify(body))
    assert.equal(body.data.attendance.eventType, 'CHECK_IN')
    assert.equal(body.data.attendance.employee.fullName, account.fullName)

    const replay = await fetch(`${baseUrl}/api/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: created.data.qrCode.token, location: null }),
    })
    const replayBody = (await replay.json()) as ErrorBody

    assert.equal(replay.status, 400)
    assert.equal(replayBody.error.code, 'INVALID_QR_CODE')
  }))

test('POST /api/attendance/scan validates the token field', () =>
  serve(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: '   ', location: null }),
    })
    const body = (await response.json()) as ErrorBody

    assert.equal(response.status, 400)
    assert.equal(body.error.code, 'VALIDATION_ERROR')
  }))
