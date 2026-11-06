import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withServer } from '../../../shared/testing/with-server.ts'
import { InMemoryAttendanceReportRepository } from '../testing/in-memory-attendance-report.repository.ts'
import { AttendanceReportService } from '../service/attendance-report.service.ts'
import { createReportRoutes } from '../routes/report.routes.ts'
import { AttendanceReportController } from './attendance-report.ts'

const TODAY = '2026-11-06'
const HEADER_LINE =
  'Employee ID,Full Name,Username,Department,Date,Check-in Time,Check-out Time,Attendance Status,Working Hours'

const routes = () => {
  const repository = new InMemoryAttendanceReportRepository(
    [{ id: '1', fullName: 'Nguyen Van A', username: 'a', department: 'IT', isActive: true }],
    [{ employeeId: '1', date: '2026-11-02', checkIn: '08:55:00', checkOut: '17:30:00' }],
  )
  const service = new AttendanceReportService(repository, '09:00:00', () => TODAY)
  return createReportRoutes(new AttendanceReportController(service, () => TODAY))
}

test('GET /api/reports/attendance returns the filter and the records', async () => {
  await withServer(routes(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/reports/attendance?date=2026-11-02`)
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.deepEqual(body.data.filter, { startDate: '2026-11-02', endDate: '2026-11-02' })
    assert.equal(body.data.records.length, 1)
    assert.equal(body.data.records[0].status, 'present')
  })
})

test('GET /api/reports/attendance defaults to today', async () => {
  await withServer(routes(), async (baseUrl) => {
    const body = await (await fetch(`${baseUrl}/api/reports/attendance`)).json()

    assert.deepEqual(body.data.filter, { startDate: TODAY, endDate: TODAY })
    assert.equal(body.data.records[0].status, 'absent')
  })
})

test('GET /api/reports/attendance/export returns an attachment csv', async () => {
  await withServer(routes(), async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/reports/attendance/export?startDate=2026-11-02&endDate=2026-11-02`,
    )

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'text/csv; charset=utf-8')
    assert.equal(
      response.headers.get('content-disposition'),
      'attachment; filename="tmc-attendance-report-2026-11-02_2026-11-02.csv"',
    )
    const text = await response.text()
    assert.ok(text.includes('1,Nguyen Van A,a,IT,2026-11-02,08:55:00,17:30:00,Present,8.58'))
  })
})

test('export of an empty result is the header only', async () => {
  await withServer(routes(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/reports/attendance/export?date=2026-11-07`)
    // response.text() strips a leading BOM, so decode the raw bytes to prove it is on the wire.
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await response.arrayBuffer())

    assert.equal(text, `\uFEFF${HEADER_LINE}`)
  })
})

test('invalid parameters are a 400 VALIDATION_ERROR on both endpoints', async () => {
  await withServer(routes(), async (baseUrl) => {
    for (const path of ['/api/reports/attendance', '/api/reports/attendance/export']) {
      const response = await fetch(`${baseUrl}${path}?status=foo`)
      const body = await response.json()

      assert.equal(response.status, 400)
      assert.equal(body.error.code, 'VALIDATION_ERROR')
    }
  })
})
