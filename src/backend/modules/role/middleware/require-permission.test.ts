import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { NextFunction, Request, Response } from 'express'
import { AuthenticationError, ForbiddenError } from '../../../shared/errors/app-error.ts'
import type { PermissionChecker } from '../repository/permission-checker.ts'
import { requirePermission } from './require-permission.ts'

class StubPermissionChecker implements PermissionChecker {
  readonly calls: Array<[string, string]> = []
  private readonly granted: boolean

  constructor(granted: boolean) {
    this.granted = granted
  }

  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    this.calls.push([userId, permissionCode])
    return this.granted
  }
}

const run = async (checker: PermissionChecker, locals: Record<string, unknown>) => {
  let nextCalls = 0
  const next: NextFunction = () => {
    nextCalls += 1
  }
  const middleware = requirePermission(checker, 'report.view')

  await middleware({} as Request, { locals } as unknown as Response, next)

  return { nextCalls }
}

const signedIn = { user: { id: '1', username: 'admin01', role: 'admin' } }

test('calls next when the user has the permission', async () => {
  const checker = new StubPermissionChecker(true)

  const { nextCalls } = await run(checker, signedIn)

  assert.equal(nextCalls, 1)
  assert.deepEqual(checker.calls, [['1', 'report.view']])
})

test('rejects with ForbiddenError when the permission is missing', async () => {
  const checker = new StubPermissionChecker(false)
  let nextCalled = false

  await assert.rejects(
    requirePermission(checker, 'report.view')(
      {} as Request,
      { locals: signedIn } as unknown as Response,
      () => {
        nextCalled = true
      },
    ) as Promise<void>,
    ForbiddenError,
  )
  assert.equal(nextCalled, false)
})

test('rejects with AuthenticationError when requireAuth did not run', async () => {
  const checker = new StubPermissionChecker(true)

  await assert.rejects(run(checker, {}), AuthenticationError)
  assert.deepEqual(checker.calls, [])
})
