import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createQrToken,
  distanceInMeters,
  hashQrToken,
  isQrCodeExpired,
  locationWithinTolerance,
  type QrCodeRecord,
} from './qr-code.ts'

const qrCode = (expiresAt: Date): QrCodeRecord => ({
  id: '1',
  employeeId: '2',
  tokenHash: 'hash',
  issuedAt: new Date('2026-11-08T08:00:00.000Z'),
  expiresAt,
  revokedAt: null,
  location: null,
})

test('hashes tokens with SHA-256 deterministically', () => {
  assert.equal(hashQrToken('token'), hashQrToken('token'))
  assert.match(hashQrToken('token'), /^[a-f0-9]{64}$/)
  assert.notEqual(hashQrToken('token'), hashQrToken('other'))
})

test('creates random tokens and matching hashes', () => {
  const first = createQrToken()
  const second = createQrToken()

  assert.notEqual(first.token, second.token)
  assert.equal(first.hash, hashQrToken(first.token))
  assert.equal(second.hash, hashQrToken(second.token))
})

test('detects expiry at the exact expiry instant', () => {
  const expiresAt = new Date('2026-11-08T08:00:05.000Z')

  assert.equal(isQrCodeExpired(qrCode(expiresAt), new Date('2026-11-08T08:00:04.999Z')), false)
  assert.equal(isQrCodeExpired(qrCode(expiresAt), expiresAt), true)
})

test('measures distance and applies the one metre tolerance', () => {
  const origin = { latitude: 10.772, longitude: 106.658, accuracy: 5 }

  assert.equal(distanceInMeters(origin, origin), 0)
  assert.equal(
    locationWithinTolerance(origin, { ...origin, latitude: origin.latitude + 0.000001 }),
    true,
  )
  assert.equal(
    locationWithinTolerance(origin, { ...origin, latitude: origin.latitude + 0.001 }),
    false,
  )
})
