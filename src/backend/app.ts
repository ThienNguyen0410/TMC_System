import cors from 'cors'
import express from 'express'
import { pool } from '../database/config.ts'
import { AuthController } from './modules/user/controller/auth.ts'
import { PostgresAuthRepository } from './modules/user/repository/postgres-auth.repository.ts'
import { createAuthRouter } from './modules/user/routes/auth.routes.ts'
import { AuthService } from './modules/user/service/auth.service.ts'
import { errorHandler, notFoundHandler } from './shared/http/error-handler.ts'

export const createApp = () => {
  const authRepository = new PostgresAuthRepository(pool)
  const authService = new AuthService(authRepository)
  const authController = new AuthController(authService)

  const app = express()

  app.disable('x-powered-by')
  app.use(cors())
  app.use(express.json())

  app.use('/api/auth', createAuthRouter(authController))

  app.get('/api/health', (_request, response) => {
    response.json({ data: { status: 'ok' } })
  })

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
