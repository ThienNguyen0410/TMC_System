import type { IncomingHttpHeaders } from 'node:http'

export interface HttpRequest {
  method: string
  path: string
  query: URLSearchParams
  headers: IncomingHttpHeaders
  body: unknown
}

export interface HttpResponse {
  status: number
  body: unknown
}

export type RouteHandler = (request: HttpRequest) => Promise<HttpResponse>

export interface Route {
  method: string
  path: string
  handler: RouteHandler
}
