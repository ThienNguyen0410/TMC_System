import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  changeUserRoleSchema,
  replaceRolePermissionsSchema,
  updateRoleSchema,
  userIdParamSchema,
} from './role.schema.ts'

test('userIdParamSchema rejects non-numeric and oversized ids', () => {
  for (const value of ['abc', '1e3', '-1', '1234567890123456789', '']) {
    assert.equal(userIdParamSchema.safeParse(value).success, false, value)
  }

  assert.equal(userIdParamSchema.safeParse('42').success, true)
})

test('body schemas reject a missing body', () => {
  for (const schema of [updateRoleSchema, replaceRolePermissionsSchema, changeUserRoleSchema]) {
    assert.equal(schema.safeParse(undefined).success, false)
  }
})

test('changeUserRoleSchema only accepts system roles', () => {
  assert.equal(changeUserRoleSchema.safeParse({ role: 'hr' }).success, false)
  assert.equal(changeUserRoleSchema.safeParse({ role: 'admin' }).success, true)
})

test('updateRoleSchema accepts null and trims', () => {
  assert.deepEqual(updateRoleSchema.parse({ description: '  x ' }), { description: 'x' })
  assert.deepEqual(updateRoleSchema.parse({ description: null }), { description: null })
})

test('replaceRolePermissionsSchema accepts a list of codes', () => {
  assert.deepEqual(replaceRolePermissionsSchema.parse({ permissionCodes: ['report.view'] }), {
    permissionCodes: ['report.view'],
  })
  assert.equal(replaceRolePermissionsSchema.safeParse({ permissionCodes: 'report.view' }).success, false)
})
