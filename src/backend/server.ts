import { createApp } from './app.ts'
import { env } from './config/env.ts'

const server = createApp()

server.listen(env.port, () => {
  console.info(`TMC backend listening on http://localhost:${env.port}`)
})
