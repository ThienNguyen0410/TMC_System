import { Router } from 'express'
import { requireAuth } from '../middleware/require-auth.ts'
import { requireRole } from '../middleware/require-role.ts'
import type { AuthService } from '../service/auth.service.ts'
import type { UserController } from '../controller/user.ts'

export const createUserRouter = (controller: UserController, authService: AuthService): Router => {
  const router = Router()

  // Account management covers every employee, so only admins may use it.
  router.use(requireAuth(authService), requireRole('admin'))

  router.get('/', (request, response) => controller.list(request, response))
  router.put('/:id', (request, response) => controller.update(request, response))

  return router
}
