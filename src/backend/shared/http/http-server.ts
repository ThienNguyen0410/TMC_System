import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { AppError } from '../errors/app-error.ts'
import type { HttpRequest, HttpResponse, Route } from './http.types.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const readBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  if (chunks.length === 0) {
    return undefined
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim()
  if (rawBody === '') {
    return undefined
  }

  try {
    return JSON.parse(rawBody) as unknown
  } catch {
    throw new AppError('Request body must contain valid JSON', 400, 'INVALID_JSON')
  }
}

const writeJson = (response: ServerResponse, status: number, body: unknown): void => {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    ...CORS_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  })
  response.end(payload)
}

const toErrorResponse = (error: unknown): HttpResponse => {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
    }
  }

  console.error(error)
  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected server error',
      },
    },
  }
}

export const createHttpServer = (routes: Route[]): Server =>
  createServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, CORS_HEADERS)
      response.end()
      return
    }

    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    const route = routes.find(
      (candidate) => candidate.method === request.method && candidate.path === url.pathname,
    )

    if (!route) {
      writeJson(response, 404, {
        error: {
          code: 'NOT_FOUND',
          message: `No route for ${request.method ?? 'UNKNOWN'} ${url.pathname}`,
        },
      })
      return
    }

    try {
      const body = await readBody(request)
      const httpRequest: HttpRequest = {
        method: request.method ?? 'GET',
        path: url.pathname,
        query: url.searchParams,
        headers: request.headers,
        body,
      }
      const result = await route.handler(httpRequest)
      writeJson(response, result.status, result.body)
    } catch (error) {
      const result = toErrorResponse(error)
      writeJson(response, result.status, result.body)
    }
  })
