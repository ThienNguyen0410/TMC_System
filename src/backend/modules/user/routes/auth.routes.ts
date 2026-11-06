import { Router } from 'express'
import type { AuthController } from '../controller/auth.ts'
import { requireAuth } from '../middleware/require-auth.ts'
import type { AuthService } from '../service/auth.service.ts'

export const createAuthRouter = (controller: AuthController, authService: AuthService): Router => {
  const router = Router()

  router.post('/login', (request, response) => controller.login(request, response))
  router.post('/register', (request, response) => controller.register(request, response))
  router.post('/refresh', (request, response) => controller.refresh(request, response))
  router.post('/logout', (request, response) => controller.logout(request, response))
  router.get('/me', requireAuth(authService), (request, response) =>
    controller.me(request, response),
  )

  return router
}
