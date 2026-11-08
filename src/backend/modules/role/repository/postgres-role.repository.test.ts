import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Pool } from 'pg'
import { PostgresRoleRepository } from './postgres-role.repository.ts'

/** A pool whose single client fails on the given statements and records how it was released. */
const createFailingPool = (failures: Record<string, Error>) => {
  const released: unknown[] = []
  const client = {
    query: async (sql: string) => {
      const failing = Object.entries(failures).find(([prefix]) => sql.trimStart().startsWith(prefix))
      if (failing) {
        throw failing[1]
      }
      return { rows: [], rowCount: 0 }
    },
    release: (error?: unknown) => {
      released.push(error)
    },
  }
  const pool = { connect: async () => client } as unknown as Pool
  return { pool, released }
}

test('a failed transaction rejects with the original error and returns the client to the pool', async () => {
  const original = new Error('delete failed')
  const { pool, released } = createFailingPool({ DELETE: original })

  await assert.rejects(new PostgresRoleRepository(pool).replaceRolePermissions('employee', []), original)

  assert.deepEqual(released, [undefined])
})

test('a failed rollback keeps the original error and discards the broken client', async () => {
  const original = new Error('delete failed')
  const rollbackFailure = new Error('connection lost')
  const { pool, released } = createFailingPool({ DELETE: original, ROLLBACK: rollbackFailure })

  await assert.rejects(new PostgresRoleRepository(pool).replaceRolePermissions('employee', []), original)

  assert.deepEqual(released, [rollbackFailure])
})
