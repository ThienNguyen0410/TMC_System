import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ConflictError, ForbiddenError } from '../../../shared/errors/app-error.ts'
import { AdminProtectedRoleChangePolicy } from './admin-protected-role-change-policy.ts'
import type { UserRoleAssignment } from './role.ts'

const policy = new AdminProtectedRoleChangePolicy()

const assignment = (overrides: Partial<UserRoleAssignment>): UserRoleAssignment => ({
  userId: '2',
  username: 'someone',
  role: 'employee',
  isActive: true,
  ...overrides,
})

test('allows promoting an employee to admin', () => {
  assert.doesNotThrow(() =>
    policy.assertCanChange({
      actorId: '1',
      target: assignment({ userId: '2', role: 'employee' }),
      newRole: 'admin',
      otherActiveAdminCount: 1,
    }),
  )
})

test("forbids changing another admin's role", () => {
  assert.throws(
    () =>
      policy.assertCanChange({
        actorId: '1',
        target: assignment({ userId: '2', role: 'admin' }),
        newRole: 'employee',
        otherActiveAdminCount: 1,
      }),
    ForbiddenError,
  )
})

test('allows an admin to demote themselves when another active admin exists', () => {
  assert.doesNotThrow(() =>
    policy.assertCanChange({
      actorId: '1',
      target: assignment({ userId: '1', role: 'admin' }),
      newRole: 'employee',
      otherActiveAdminCount: 1,
    }),
  )
})

test('blocks the last active admin from demoting themselves', () => {
  assert.throws(
    () =>
      policy.assertCanChange({
        actorId: '1',
        target: assignment({ userId: '1', role: 'admin' }),
        newRole: 'employee',
        otherActiveAdminCount: 0,
      }),
    ConflictError,
  )
})
