import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hashPassword, verifyPassword } from './password.ts'

const seededHash =
  'scrypt$16384$8$1$HU8V9LmLTAyZ4Nl88LTNOg==$ZKt5gU1dqtQRK0inSVn9basOssmyDtVhUwk/BQ/kpQaTDhKn682rOvKeolpfF/gWj1vMcDhcwZquhnC1ZsNEKQ=='

test('hashes and verifies a password', async () => {
  const hash = await hashPassword('Secret123!')

  assert.match(hash, /^scrypt\$16384\$8\$1\$/)
  assert.equal(await verifyPassword('Secret123!', hash), true)
  assert.equal(await verifyPassword('Wrong123!', hash), false)
})

test('verifies the seeded scrypt hash from the migration', async () => {
  assert.equal(await verifyPassword('Employee123!', seededHash), true)
  assert.equal(await verifyPassword('employee123!', seededHash), false)
})

test('rejects malformed stored hashes', async () => {
  assert.equal(await verifyPassword('x', 'not-a-hash'), false)
  assert.equal(await verifyPassword('x', 'scrypt$16384$8$1$onlyfour'), false)
  assert.equal(await verifyPassword('x', 'scrypt$bad$8$1$c2FsdA==$aGFzaA=='), false)
})
