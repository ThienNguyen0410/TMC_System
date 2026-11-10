import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AppError } from '../../../shared/errors/app-error.ts'
import type { AttendanceEmployee } from '../domain/attendance.ts'
import { InMemoryAttendanceRepository } from '../testing/in-memory-attendance.repository.ts'
import { AttendanceService } from './attendance.service.ts'
import { QrCodeService } from './qr-code.service.ts'

const START = new Date('2026-11-08T08:00:00.000Z')
const EMPLOYEE: AttendanceEmployee = {
  id: '2',
  username: 'employee01',
  fullName: 'Nguyen Van An',
  department: 'Engineering',
  isActive: true,
}
const EMPLOYEE_LOCATION = { latitude: 10.772, longitude: 106.658, accuracy: 5 }
const KIOSK_LOCATION = { latitude: 10.7720005, longitude: 106.6580005, accuracy: 8 }

const setup = () => {
  let now = START
  const repository = new InMemoryAttendanceRepository()
  repository.addEmployee(EMPLOYEE)

  const clock = () => now
  const qrCodeService = new QrCodeService(repository, clock)
  const service = new AttendanceService(
    repository,
    qrCodeService,
    { cooldownSeconds: 30 },
    clock,
  )

  return {
    repository,
    qrCodeService,
    service,
    advance: (milliseconds: number) => {
      now = new Date(now.getTime() + milliseconds)
    },
  }
}

test('records CHECK_IN first and CHECK_OUT for the next scan after the cooldown', async () => {
  const { repository, qrCodeService, service, advance } = setup()
  const firstQr = await qrCodeService.create(EMPLOYEE.id, EMPLOYEE_LOCATION)

  const first = await service.scan({
    token: firstQr.token,
    location: KIOSK_LOCATION,
  })

  assert.equal(first.eventType, 'CHECK_IN')
  assert.equal(first.employee.id, EMPLOYEE.id)
  assert.equal(first.recordedAt, START)
  assert.equal(repository.records.length, 1)
  assert.equal(repository.outbox.length, 1)
  assert.notEqual(repository.qrCodes[0].revokedAt, null)

  advance(31_000)
  const secondQr = await qrCodeService.create(EMPLOYEE.id, EMPLOYEE_LOCATION)
  const second = await service.scan({ token: secondQr.token, location: KIOSK_LOCATION })

  assert.equal(second.eventType, 'CHECK_OUT')
  assert.equal(repository.records.length, 2)
  assert.equal(repository.outbox.length, 2)
})

test('rejects a second scan during the cooldown', async () => {
  const { qrCodeService, service, advance } = setup()
  const firstQr = await qrCodeService.create(EMPLOYEE.id, EMPLOYEE_LOCATION)
  await service.scan({ token: firstQr.token, location: KIOSK_LOCATION })

  advance(1_000)
  const secondQr = await qrCodeService.create(EMPLOYEE.id, EMPLOYEE_LOCATION)

  await assert.rejects(service.scan({ token: secondQr.token, location: KIOSK_LOCATION }), (error) => {
    return (error as AppError).code === 'ATTENDANCE_COOLDOWN'
  })
})

test('rejects an expired QR code', async () => {
  const { qrCodeService, service, advance } = setup()
  const created = await qrCodeService.create(EMPLOYEE.id, null)
  advance(5_000)

  await assert.rejects(service.scan({ token: created.token, location: null }), (error) => {
    return (error as AppError).code === 'QR_CODE_EXPIRED'
  })
})

test('rejects replaying a QR code that was already used', async () => {
  const { qrCodeService, service, advance } = setup()
  const created = await qrCodeService.create(EMPLOYEE.id, null)
  await service.scan({ token: created.token, location: null })

  advance(31_000)
  await assert.rejects(service.scan({ token: created.token, location: null }), (error) => {
    return (error as AppError).code === 'INVALID_QR_CODE'
  })
})

test('rejects a QR code generated more than one metre away', async () => {
  const { qrCodeService, service } = setup()
  const created = await qrCodeService.create(EMPLOYEE.id, EMPLOYEE_LOCATION)

  await assert.rejects(
    service.scan({
      token: created.token,
      location: { ...KIOSK_LOCATION, latitude: KIOSK_LOCATION.latitude + 0.001 },
    }),
    (error) => (error as AppError).code === 'QR_LOCATION_MISMATCH',
  )
})

test('skips the location check when either side has no GPS reading', async () => {
  const { qrCodeService, service } = setup()
  const withoutLocation = await qrCodeService.create(EMPLOYEE.id, null)

  const confirmation = await service.scan({
    token: withoutLocation.token,
    location: KIOSK_LOCATION,
  })

  assert.equal(confirmation.eventType, 'CHECK_IN')
})

test('rejects QR codes of inactive employees', async () => {
  const { repository, qrCodeService, service } = setup()
  repository.addEmployee({ ...EMPLOYEE, id: '3', isActive: false })
  const created = await qrCodeService.create('3', null)

  await assert.rejects(service.scan({ token: created.token, location: null }), (error) => {
    return (error as AppError).code === 'INVALID_QR_CODE'
  })
})
