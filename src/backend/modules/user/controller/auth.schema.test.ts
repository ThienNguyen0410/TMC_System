import assert from 'node:assert/strict'
import { test } from 'node:test'
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from './auth.schema.ts'

const validInput = {
  fullName: '  Nguyen Van An  ',
  username: '  Employee09 ',
  password: 'Secret123!',
  email: '  You@Example.com ',
  phone: '0901234567',
  dateOfBirth: '2003-05-15',
  role: 'employee',
}

test('accepts and normalizes a valid registration', () => {
  const result = registerSchema.safeParse(validInput)

  assert.ok(result.success)
  assert.equal(result.data.fullName, 'Nguyen Van An')
  assert.equal(result.data.username, 'employee09')
  assert.equal(result.data.email, 'you@example.com')
})

test('accepts canonical roles and normalizes current UI aliases', () => {
  const canonicalRoles = [
    'employee',
    'production_supervisor',
    'hr',
    'security_guard',
    'admin',
    'executive_management',
  ] as const

  for (const role of canonicalRoles) {
    const result = registerSchema.safeParse({ ...validInput, role })
    assert.ok(result.success)
    assert.equal(result.data.role, role)
  }

  const alias = registerSchema.safeParse({ ...validInput, role: 'security-guard' })

  assert.ok(alias.success)
  assert.equal(alias.data.role, 'security_guard')
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
    { ...validInput, role: 'unknown' },
    { ...validInput, role: '' },
  ]

  for (const input of invalidInputs) {
    assert.equal(registerSchema.safeParse(input).success, false, JSON.stringify(input))
  }
})

test('accepts a valid login and trims the username', () => {
  const result = loginSchema.safeParse({ username: '  admin ', password: '123456' })

  assert.ok(result.success)
  assert.equal(result.data.username, 'admin')
  assert.equal(result.data.password, '123456')
})

test('rejects missing or blank login credentials', () => {
  const invalidInputs = [
    { password: '123456' },
    { username: 'admin' },
    { username: '   ', password: '123456' },
    { username: 'admin', password: '' },
  ]

  for (const input of invalidInputs) {
    assert.equal(loginSchema.safeParse(input).success, false, JSON.stringify(input))
  }
})

test('accepts and normalizes a forgot-password email', () => {
  const result = forgotPasswordSchema.safeParse({ email: '  Employee01@Example.com ' })

  assert.ok(result.success)
  assert.equal(result.data.email, 'employee01@example.com')
})

test('rejects invalid forgot-password and reset-password input', () => {
  const invalidForgot = [{}, { email: '' }, { email: 'not-an-email' }]
  const invalidReset = [
    {},
    { password: 'Secret123!' },
    { token: '   ', password: 'Secret123!' },
    { token: 'token', password: 'weakpassword' },
  ]

  for (const input of invalidForgot) {
    assert.equal(forgotPasswordSchema.safeParse(input).success, false, JSON.stringify(input))
  }

  for (const input of invalidReset) {
    assert.equal(resetPasswordSchema.safeParse(input).success, false, JSON.stringify(input))
  }
})
