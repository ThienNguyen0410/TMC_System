import type { RequestHandler } from 'express'
import { ForbiddenError } from '../../../shared/errors/app-error.ts'
import type { AuthUser, UserRole } from '../domain/auth-user.ts'

// Runs after requireAuth, which puts the user (role read from the database) in response.locals.
export const requireRole = (...roles: UserRole[]): RequestHandler => (_request, response, next) => {
  const user = response.locals.user as AuthUser | undefined

  if (!user || !roles.includes(user.role)) {
    throw new ForbiddenError()
  }

  next()
}
