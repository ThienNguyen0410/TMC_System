import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHttpServer } from '../http/http-server.ts'
import type { Route } from '../http/http.types.ts'

// Starts a real HTTP server on a random port for the duration of `run`.
export const withServer = async (
  routes: Route[],
  run: (baseUrl: string) => Promise<void>,
): Promise<void> => {
  const server: Server = createHttpServer(routes)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const { port } = server.address() as AddressInfo
  try {
    await run(`http://localhost:${port}`)
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
}
