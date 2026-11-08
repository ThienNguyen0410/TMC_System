import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import express, { type Express } from 'express'
import { errorHandler, notFoundHandler } from '../http/error-handler.ts'

// Runs `run` against a real Express server on a random port, with the app's error handlers installed.
export async function withServer(
  mount: (app: Express) => void,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = express()
  mount(app)
  app.use(notFoundHandler)
  app.use(errorHandler)

  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')

  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
      server.closeAllConnections()
    })
  }
}
