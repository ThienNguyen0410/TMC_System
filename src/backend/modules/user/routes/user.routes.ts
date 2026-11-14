import { Router, type RequestHandler } from 'express'
import { requireAuth } from '../middleware/require-auth.ts'
import type { AuthService } from '../service/auth.service.ts'
import type { UserController } from '../controller/user.ts'

export const createUserRouter = (
  controller: UserController,
  authService: AuthService,
  canManageUsers: RequestHandler,
): Router => {
  const router = Router()

  // Account management covers every employee; app.ts decides who passes canManageUsers.
  router.use(requireAuth(authService), canManageUsers)

  router.get('/', (request, response) => controller.list(request, response))
  router.put('/:id', (request, response) => controller.update(request, response))
  router.delete('/:id', (request, response) => controller.delete(request, response))

  return router
}
