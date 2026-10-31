import type { Route } from '../../../shared/http/http.types.ts'
import type { AuthController } from '../controller/auth.ts'

export const createAuthRoutes = (controller: AuthController): Route[] => [
  {
    method: 'POST',
    path: '/api/auth/login',
    handler: (request) => controller.login(request),
  },
]
