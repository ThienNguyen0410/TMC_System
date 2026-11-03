import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerSchema } from './auth.schema.ts'

const validInput = {
  fullName: '  Nguyen Van An  ',
  username: '  Employee09 ',
  password: 'Secret123!',
  email: '  You@Example.com ',
  phone: '0901234567',
  dateOfBirth: '2003-05-15',
}

test('accepts and normalizes a valid registration', () => {
  const result = registerSchema.safeParse(validInput)

  assert.ok(result.success)
  assert.equal(result.data.fullName, 'Nguyen Van An')
  assert.equal(result.data.username, 'employee09')
  assert.equal(result.data.email, 'you@example.com')
})

test('strips fields the client is not allowed to set', () => {
  const result = registerSchema.safeParse({ ...validInput, role: 'admin' })

  assert.ok(result.success)
  assert.equal('role' in result.data, false)
})

test('rejects invalid registration fields', () => {
  const invalidInputs = [
    { ...validInput, fullName: 'A' },
    { ...validInput, username: 'ab' },
    { ...validInput, password: 'weakpassword' },
    { ...validInput, email: 'not-an-email' },
    { ...validInput, email: `${'a'.repeat(95)}@example.com` },
    { ...validInput, phone: '12345' },
    { ...validInput, dateOfBirth: '2999-01-01' },
    { ...validInput, dateOfBirth: '2003-02-31' },
  ]

  for (const input of invalidInputs) {
    assert.equal(registerSchema.safeParse(input).success, false, JSON.stringify(input))
  }
})
