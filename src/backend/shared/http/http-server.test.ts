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

test('handler headers cannot override CORS or Content-Length, and keys never duplicate', async () => {
  const routes: Route[] = [
    {
      method: 'GET',
      path: '/h',
      handler: async () => ({
        status: 200,
        body: 'xin chào',
        headers: {
          'content-type': 'text/csv',
          'Content-Length': '1',
          'Access-Control-Allow-Origin': 'https://evil.example',
        },
      }),
    },
  ]

  await withServer(routes, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/h`)

    assert.equal(response.headers.get('content-type'), 'text/csv')
    assert.equal(response.headers.get('access-control-allow-origin'), '*')
    assert.equal(await response.text(), 'xin chào') // multibyte: length is in bytes, not characters
  })
})

test('a string body without headers is served as plain text', async () => {
  const routes: Route[] = [
    { method: 'GET', path: '/t', handler: async () => ({ status: 200, body: 'hi' }) },
  ]

  await withServer(routes, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/t`)

    assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8')
  })
})
