import type { RequestHandler } from 'express'
import { AuthenticationError, ForbiddenError } from '../../../shared/errors/app-error.ts'
import type { PermissionChecker } from '../repository/permission-checker.ts'

/**
 * Lets the request through only when the signed-in user holds `permissionCode`.
 * Must be mounted after requireAuth, which sets response.locals.user.
 */
export const requirePermission = (
  checker: PermissionChecker,
  permissionCode: string,
): RequestHandler => async (_request, response, next) => {
  const userId: unknown = response.locals.user?.id

  if (typeof userId !== 'string') {
    throw new AuthenticationError('Authentication required.')
  }

  if (!(await checker.hasPermission(userId, permissionCode))) {
    throw new ForbiddenError()
  }

  next()
}
