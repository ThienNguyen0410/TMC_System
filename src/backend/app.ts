import type { Server } from 'node:http'
import { pool } from '../database/config.ts'
import { AuthController } from './modules/user/controller/auth.ts'
import { PostgresAuthRepository } from './modules/user/repository/postgres-auth.repository.ts'
import { createAuthRoutes } from './modules/user/routes/auth.routes.ts'
import { AuthService } from './modules/user/service/auth.service.ts'
import { createHttpServer } from './shared/http/http-server.ts'
import type { Route } from './shared/http/http.types.ts'

export const createApp = (): Server => {
  const authRepository = new PostgresAuthRepository(pool)
  const authService = new AuthService(authRepository)
  const authController = new AuthController(authService)

  const routes: Route[] = [
    ...createAuthRoutes(authController),
    {
      method: 'GET',
      path: '/api/health',
      handler: async () => ({ status: 200, body: { data: { status: 'ok' } } }),
    },
  ]

  return createHttpServer(routes)
}
