import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createRefreshToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from './tokens.ts'

const user = { id: '1', username: 'admin', role: 'employee' as const }
const secret = 'test-secret'

test('signs and verifies an access token', async () => {
  const token = await signAccessToken(user, secret, 60)

  assert.deepEqual(await verifyAccessToken(token, secret), user)
})

test('rejects tokens signed with another secret or tampered', async () => {
  const token = await signAccessToken(user, secret, 60)

  assert.equal(await verifyAccessToken(token, 'another-secret'), null)
  assert.equal(await verifyAccessToken(`${token}x`, secret), null)
  assert.equal(await verifyAccessToken('not-a-jwt', secret), null)
})

test('creates unique refresh tokens hashed with sha256', () => {
  const first = createRefreshToken()
  const second = createRefreshToken()

  assert.notEqual(first.token, second.token)
  assert.equal(first.hash, hashToken(first.token))
  assert.match(first.hash, /^[a-f0-9]{64}$/)
})
