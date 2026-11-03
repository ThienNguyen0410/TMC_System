import type { RequestHandler } from 'express'
import { AuthenticationError } from '../../../shared/errors/app-error.ts'
import type { AuthService } from '../service/auth.service.ts'

export const requireAuth = (authService: AuthService): RequestHandler => async (
  request,
  response,
  next,
) => {
  const header = request.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined
  const user = await authService.authenticateAccessToken(token)

  if (!user) {
    throw new AuthenticationError('Authentication required.')
  }

  response.locals.user = user
  next()
}
