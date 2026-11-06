import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AppError } from '../errors/app-error.ts'
import { withServer } from '../testing/with-server.ts'
import type { Route } from './http.types.ts'

test('serves a string body verbatim with the given headers', async () => {
  const routes: Route[] = [
    {
      method: 'GET',
      path: '/csv',
      handler: async () => ({
        status: 200,
        body: 'a,b',
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
      }),
    },
  ]

  await withServer(routes, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/csv`)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'text/csv; charset=utf-8')
    assert.equal(await response.text(), 'a,b')
  })
})

test('still serves object bodies as JSON', async () => {
  const routes: Route[] = [
    { method: 'GET', path: '/json', handler: async () => ({ status: 200, body: { data: 1 } }) },
  ]

  await withServer(routes, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/json`)
    assert.match(response.headers.get('content-type') ?? '', /application\/json/)
    assert.deepEqual(await response.json(), { data: 1 })
  })
})

test('maps AppError to the JSON error envelope', async () => {
  const routes: Route[] = [
    {
      method: 'GET',
      path: '/boom',
      handler: async () => {
        throw new AppError('nope', 418, 'TEAPOT')
      },
    },
  ]

  await withServer(routes, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/boom`)
    assert.equal(response.status, 418)
    assert.deepEqual(await response.json(), { error: { code: 'TEAPOT', message: 'nope' } })
  })
})
