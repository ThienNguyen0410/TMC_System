import assert from 'node:assert/strict'
import { test } from 'node:test'
import { signAccessToken } from '../../../shared/security/tokens.ts'
import { withServer } from '../../../shared/testing/with-server.ts'
import type { AuthUser, UserRole } from '../../user/domain/auth-user.ts'
import type { AuthRepository } from '../../user/repository/auth.repository.ts'
import { AuthService } from '../../user/service/auth.service.ts'
import { createReportRouter } from '../routes/report.routes.ts'
import { AttendanceReportService } from '../service/attendance-report.service.ts'
import { InMemoryAttendanceReportRepository } from '../testing/in-memory-attendance-report.repository.ts'
import { AttendanceReportController } from './attendance-report.ts'

interface ListBody {
  data: { filter: unknown; records: Array<{ status: string }> }
}
interface ErrorBody {
  error: { code: string }
}

const TODAY = '2026-11-06'
const SECRET = 'test-secret'
const HEADER_LINE =
  'Employee ID,Full Name,Username,Department,Date,Check-in Time,Check-out Time,Attendance Status,Working Hours'

const accountOf = (id: string, role: UserRole): AuthUser => ({
  id,
  username: `user${id}`,
  role,
  fullName: `User ${id}`,
  email: null,
  phone: null,
  dateOfBirth: null,
  department: null,
})

// Only findUserById is reached by requireAuth; the stored role is the one that counts.
const accounts = new Map([
  ['1', accountOf('1', 'admin')],
  ['2', accountOf('2', 'employee')],
])
const authService = new AuthService(
  { findUserById: async (id: string) => accounts.get(id) ?? null } as unknown as AuthRepository,
  { accessTokenSecret: SECRET, accessTokenTtlSeconds: 60, refreshTokenTtlDays: 7 },
)

const tokenFor = (id: string, role: UserRole) =>
  signAccessToken({ id, username: `user${id}`, role }, SECRET, 60)

const asAdmin = async () => ({ Authorization: `Bearer ${await tokenFor('1', 'admin')}` })

const serve = (run: (baseUrl: string) => Promise<void>) => {
  const repository = new InMemoryAttendanceReportRepository(
    [{ id: '1', fullName: 'Nguyen Van A', username: 'a', department: 'IT', isActive: true }],
    [{ employeeId: '1', date: '2026-11-02', checkIn: '08:55:00', checkOut: '17:30:00' }],
  )
  const service = new AttendanceReportService(repository, '09:00:00', () => TODAY)
  const controller = new AttendanceReportController(service, () => TODAY)

  return withServer((app) => app.use('/api/reports', createReportRouter(controller, authService)), run)
}

test('GET /api/reports/attendance returns the filter and the records', () =>
  serve(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/reports/attendance?date=2026-11-02`, {
      headers: await asAdmin(),
    })
    const body = (await response.json()) as ListBody

    assert.equal(response.status, 200)
    assert.deepEqual(body.data.filter, { startDate: '2026-11-02', endDate: '2026-11-02' })
    assert.equal(body.data.records.length, 1)
    assert.equal(body.data.records[0].status, 'present')
  }))

test('GET /api/reports/attendance defaults to today', () =>
  serve(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/reports/attendance`, { headers: await asAdmin() })
    const body = (await response.json()) as ListBody

    assert.deepEqual(body.data.filter, { startDate: TODAY, endDate: TODAY })
    assert.equal(body.data.records[0].status, 'absent')
  }))

test('GET /api/reports/attendance/export returns an attachment csv', () =>
  serve(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/reports/attendance/export?startDate=2026-11-02&endDate=2026-11-02`,
      { headers: await asAdmin() },
    )

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'text/csv; charset=utf-8')
    assert.equal(
      response.headers.get('content-disposition'),
      'attachment; filename="tmc-attendance-report-2026-11-02_2026-11-02.csv"',
    )
    const text = await response.text()
    assert.ok(text.includes('1,Nguyen Van A,a,IT,2026-11-02,08:55:00,17:30:00,Present,8.58'))
  }))

test('export of an empty result is the header only', () =>
  serve(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/reports/attendance/export?date=2026-11-07`, {
      headers: await asAdmin(),
    })
    // response.text() strips a leading BOM, so decode the raw bytes to prove it is on the wire.
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await response.arrayBuffer())

    assert.equal(text, `﻿${HEADER_LINE}`)
  }))

test('invalid parameters are a 400 VALIDATION_ERROR on both endpoints', () =>
  serve(async (baseUrl) => {
    for (const path of ['/api/reports/attendance', '/api/reports/attendance/export']) {
      const response = await fetch(`${baseUrl}${path}?status=foo`, { headers: await asAdmin() })
      const body = (await response.json()) as ErrorBody

      assert.equal(response.status, 400)
      assert.equal(body.error.code, 'VALIDATION_ERROR')
    }
  }))

test('both endpoints reject a request without a valid token with 401', () =>
  serve(async (baseUrl) => {
    for (const path of ['/api/reports/attendance', '/api/reports/attendance/export']) {
      assert.equal((await fetch(`${baseUrl}${path}`)).status, 401)
      const bad = await fetch(`${baseUrl}${path}`, { headers: { Authorization: 'Bearer nope' } })
      assert.equal(bad.status, 401)
    }
  }))

test('a signed-in employee gets 403 FORBIDDEN on both endpoints', () =>
  serve(async (baseUrl) => {
    const headers = { Authorization: `Bearer ${await tokenFor('2', 'employee')}` }

    for (const path of ['/api/reports/attendance', '/api/reports/attendance/export']) {
      const response = await fetch(`${baseUrl}${path}`, { headers })
      const body = (await response.json()) as ErrorBody

      assert.equal(response.status, 403)
      assert.equal(body.error.code, 'FORBIDDEN')
    }
  }))

test('the role stored in the database wins over the role in the token', () =>
  serve(async (baseUrl) => {
    // The token claims admin, but account 2 is an employee in the database.
    const headers = { Authorization: `Bearer ${await tokenFor('2', 'admin')}` }
    const response = await fetch(`${baseUrl}/api/reports/attendance`, { headers })

    assert.equal(response.status, 403)
  }))
