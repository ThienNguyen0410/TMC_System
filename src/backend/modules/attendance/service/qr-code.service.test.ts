import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AppError } from '../../../shared/errors/app-error.ts'
import { hashQrToken } from '../domain/qr-code.ts'
import { InMemoryAttendanceRepository } from '../testing/in-memory-attendance.repository.ts'
import { QrCodeService } from './qr-code.service.ts'

const NOW = new Date('2026-11-08T08:00:00.000Z')
const LOCATION = { latitude: 10.772, longitude: 106.658, accuracy: 4 }

const setup = () => {
  const repository = new InMemoryAttendanceRepository()
  const service = new QrCodeService(repository, () => NOW)

  return { repository, service }
}

test('creates a five second QR code and stores only the token hash', async () => {
  const { repository, service } = setup()
  const created = await service.create('2', LOCATION)

  assert.equal(created.expiresAt.getTime() - created.issuedAt.getTime(), 5_000)
  assert.deepEqual(created.location, LOCATION)
  assert.equal(repository.qrCodes.length, 1)
  assert.equal(repository.qrCodes[0].tokenHash, hashQrToken(created.token))
  assert.notEqual(repository.qrCodes[0].tokenHash, created.token)
})

test('validates a stored, unexpired and unrevoked token', async () => {
  const { service } = setup()
  const created = await service.create('2', null)
  const validated = await service.validate(created.token)

  assert.equal(validated.id, created.id)
  assert.equal(validated.employeeId, '2')
})

test('rejects unknown, revoked and expired tokens with distinct codes', async () => {
  const { repository, service } = setup()
  const created = await service.create('2', null)

  await assert.rejects(service.validate('unknown'), (error) => {
    return (error as AppError).code === 'INVALID_QR_CODE'
  })

  repository.qrCodes[0].revokedAt = NOW
  await assert.rejects(service.validate(created.token), (error) => {
    return (error as AppError).code === 'INVALID_QR_CODE'
  })

  const expired = new QrCodeService(repository, () => new Date(NOW.getTime() + 6_000))
  repository.qrCodes[0].revokedAt = null
  await assert.rejects(expired.validate(created.token), (error) => {
    return (error as AppError).code === 'QR_CODE_EXPIRED'
  })
})
