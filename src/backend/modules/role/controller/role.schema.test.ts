import assert from 'node:assert/strict'
import { test } from 'node:test'
import { replaceRolePermissionsSchema, updateRoleSchema } from './role.schema.ts'

test('body schemas reject a missing body', () => {
  for (const schema of [updateRoleSchema, replaceRolePermissionsSchema]) {
    assert.equal(schema.safeParse(undefined).success, false)
  }
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

test('updateRoleSchema stores a blank description as null', () => {
  assert.deepEqual(updateRoleSchema.parse({ description: '' }), { description: null })
  assert.deepEqual(updateRoleSchema.parse({ description: '   ' }), { description: null })
})
