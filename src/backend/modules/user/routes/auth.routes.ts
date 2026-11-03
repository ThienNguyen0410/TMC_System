import { Router } from 'express'
import type { AuthController } from '../controller/auth.ts'

export const createAuthRouter = (controller: AuthController): Router => {
  const router = Router()

  router.post('/login', (request, response) => controller.login(request, response))
  router.post('/register', (request, response) => controller.register(request, response))

  return router
}
