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
  // A string body is written verbatim (use with a Content-Type header); anything else is sent as JSON.
  body: unknown
  headers?: Record<string, string>
}

export type RouteHandler = (request: HttpRequest) => Promise<HttpResponse>

export interface Route {
  method: string
  path: string
  handler: RouteHandler
}
